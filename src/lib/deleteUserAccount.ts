import mongoose from "mongoose";
import { User } from "@/models/User";
import { Posts } from "@/models/Posts";
import { Comments } from "@/models/Comments";
import { Reactions } from "@/models/Reactions";
import { Shares } from "@/models/Shares";
import { FavoriteActivities } from "@/models/FavoriteActivities";
import { UserActivityLogs } from "@/models/UserActivityLogs";
import { UserLoginStreak } from "@/models/UserLoginStreak";
import { UserPurchase } from "@/models/UserPurchase";
import { Support } from "@/models/Support";
import { UserScheduleNotification } from "@/models/UserScheduleNotification";
import { ScheduledCronJob } from "@/models/ScheduledCronJob";
import { PendingRegistration } from "@/models/PendingRegistration";
import { cronJobRegistry } from "@/cron/cronRegistry";

export class AccountDeletionError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// Prefer atomic cleanup; standalone MongoDB uses a persisted, retryable cleanup plan.
export async function deleteUserAccount(id: string, confirmation: string) {
  const session = await mongoose.startSession();
  let jobKeys: string[] = [];
  try {
    const cleanup = async (session: mongoose.ClientSession | null) => {
      const user = await User.findById(id).select("+deletionPlan").session(session);
      if (!user) throw new AccountDeletionError("User not found", 404);
      if (confirmation !== (user.email || id)) throw new AccountDeletionError("Confirmation does not match this account", 400);
      const userId = user._id;
      if (!session) {
        // Block first. Keep the account until every cleanup operation succeeds.
        await User.updateOne({ _id: userId }, { $set: { isBlocked: true, deletionPending: true } });
      }
      const posts = await Posts.find({ userId }).select("_id").session(session);
      let postIds = posts.map(post => post._id);
      const comments = await Comments.find({ $or: [{ userId }, { postId: { $in: postIds } }] }).session(session);
      let commentIds = comments.map(comment => comment._id);
      const reactions = await Reactions.find({ userId }).session(session);
      const shares = await Shares.find({ userId }).session(session);
      let affectedPosts = new Set<string>([
        ...comments.map(comment => String(comment.postId)),
        ...shares.map(share => String(share.postId)),
        ...reactions.filter(reaction => reaction.targetType === "post").map(reaction => String(reaction.targetId)),
      ]);
      let affectedComments = new Set<string>([
        ...comments.filter(comment => comment.parentCommentId).map(comment => String(comment.parentCommentId)),
        ...reactions.filter(reaction => reaction.targetType === "comment").map(reaction => String(reaction.targetId)),
      ]);
      jobKeys = (await ScheduledCronJob.find({ userId }).session(session)).map(job => job.jobKey);
      if (!session) {
        // Save references BEFORE removing anything, so retries can still repair
        // counts and remove dependent rows after a failure or process restart.
        const plan = { postIds, commentIds, affectedPosts: [...affectedPosts], affectedComments: [...affectedComments], jobKeys };
        await User.updateOne({ _id: userId, deletionPlan: null }, { $set: { deletionPlan: plan } });
        const saved = await User.findById(userId).select("+deletionPlan");
        if (!saved?.deletionPlan) throw new Error("Could not save deletion cleanup plan");
        postIds = saved.deletionPlan.postIds;
        commentIds = saved.deletionPlan.commentIds;
        affectedPosts = new Set<string>(saved.deletionPlan.affectedPosts);
        affectedComments = new Set<string>(saved.deletionPlan.affectedComments);
        jobKeys = saved.deletionPlan.jobKeys;
      }
      if (session && user.deletionPlan) {
        // A retry may run after the database has been upgraded to a replica set.
        postIds = user.deletionPlan.postIds;
        commentIds = user.deletionPlan.commentIds;
        affectedPosts = new Set<string>(user.deletionPlan.affectedPosts);
        affectedComments = new Set<string>(user.deletionPlan.affectedComments);
        jobKeys = user.deletionPlan.jobKeys;
      }
      await Reactions.deleteMany({ $or: [{ userId }, { targetType: "post", targetId: { $in: postIds } }, { targetType: "comment", targetId: { $in: commentIds } }] }, { session: session ?? undefined });
      await Shares.deleteMany({ $or: [{ userId }, { postId: { $in: postIds } }] }, { session: session ?? undefined });
      await Comments.deleteMany({ _id: { $in: commentIds } }, { session: session ?? undefined });
      // Keep others' replies on surviving posts as top-level comments.
      await Comments.updateMany({ parentCommentId: { $in: commentIds } }, { $set: { parentCommentId: null } }, { session: session ?? undefined });
      await Posts.deleteMany({ _id: { $in: postIds } }, { session: session ?? undefined });
      await Posts.updateMany({ "topReactors.userId": userId }, { $pull: { topReactors: { userId } } }, { session: session ?? undefined });
      for (const postId of affectedPosts) {
        const likesCount = await Reactions.countDocuments({ targetType: "post", targetId: postId }).session(session);
        const commentsCount = await Comments.countDocuments({ postId }).session(session);
        const sharesCount = await Shares.countDocuments({ postId }).session(session);
        await Posts.updateOne({ _id: postId }, { $set: { likesCount, commentsCount, sharesCount } }, { session: session ?? undefined });
      }
      for (const commentId of affectedComments) {
        const likesCount = await Reactions.countDocuments({ targetType: "comment", targetId: commentId }).session(session);
        const repliesCount = await Comments.countDocuments({ parentCommentId: commentId }).session(session);
        await Comments.updateOne({ _id: commentId }, { $set: { likesCount, repliesCount } }, { session: session ?? undefined });
      }
      // Transaction operations must run sequentially.
      for (const model of [FavoriteActivities, UserActivityLogs, UserLoginStreak, UserPurchase, Support, UserScheduleNotification, ScheduledCronJob]) {
        await model.deleteMany({ userId }, { session: session ?? undefined });
      }
      if (user.email) await PendingRegistration.deleteMany({ email: user.email }, { session: session ?? undefined });
      await User.deleteOne({ _id: userId }, { session: session ?? undefined });
    };
    try {
      await session.withTransaction(() => cleanup(session));
    } catch (error) {
      // Only this precise capability error permits non-transactional cleanup.
      // Network, authorization and ordinary write failures must not trigger it.
      if (error instanceof Error && "code" in error && error.code === 20 && /Transaction numbers are only allowed on a replica set member or mongos/.test(error.message)) {
        await cleanup(null);
      } else { throw error; }
    }
  } finally {
    await session.endSession();
  }
  for (const key of jobKeys) {
    const task = cronJobRegistry.get(key);
    if (task) {
      try { await task.stop(); } catch (error) { console.error("Could not stop deleted user's reminder", error); }
      cronJobRegistry.delete(key);
    }
  }
}
