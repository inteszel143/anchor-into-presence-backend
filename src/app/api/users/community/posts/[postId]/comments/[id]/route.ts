import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Comments } from "@/models/Comments";
import { Posts } from "@/models/Posts";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/lib/getAuthUser";
import { Reactions } from "@/models/Reactions";

export async function DELETE(req: NextRequest, { params }: any) {
  await connectDB();

  try {
    const { userId } = await getAuthUser(req);
    const commentId = params.id;

    // Fetch comment
    const comment = await Comments.findById(commentId);
    if (!comment) {
      return NextResponse.json(
        { status: false, message: "Comment not found" },
        { status: 404 }
      );
    }

    // Authorization check
    if (String(comment.userId) !== String(userId)) {
      return NextResponse.json(
        { status: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const postId = comment.postId;
    const parentId = comment.parentCommentId;

    // ------------------------------
    // DELETE OPERATIONS (no session)
    // ------------------------------

    // 1. Delete the main comment
    await Comments.deleteOne({ _id: commentId });

    // 2. Delete replies to this comment
    const replyDelete = await Comments.deleteMany({
      parentCommentId: commentId
    });

    // 3. Decrement comment count on post
    await Posts.updateOne(
      { _id: postId },
      { $inc: { commentsCount: -(1 + replyDelete.deletedCount) } }
    );

    // 4. If this comment was a reply, decrement parent's repliesCount
    if (parentId) {
      await Comments.updateOne(
        { _id: parentId },
        { $inc: { repliesCount: -1 } }
      );
    }

    // 5. Delete reactions for this comment
    await Reactions.deleteMany({
      targetType: "comment",
      targetId: commentId,
    });

    // 6. Delete reactions for any replies (optional but clean)
    const replyIds = await Comments.find({ parentCommentId: commentId }).distinct("_id");
    if (replyIds.length > 0) {
      await Reactions.deleteMany({
        targetType: "comment",
        targetId: { $in: replyIds }
      });
    }

    return NextResponse.json({
      status: true,
      message: "Comment deleted successfully",
      data:{},
    });

  } catch (error) {
    console.error("DELETE COMMENT ERROR:", error);
    return NextResponse.json(
      { status: false, message: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
