import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/lib/getAuthUser";
import { Posts, PostType } from "@/models/Posts";
import { Comments } from "@/models/Comments";
import { Shares } from "@/models/Shares";
import { User } from "@/models/User";
import { apiErrorResponse } from "@/lib/apiResponse";
import { Reactions } from "@/models/Reactions";

/**
 * DELETE /api/users/community/posts/[postId]
 * Deletes a post created by the authenticated user along with linked comments and reactions.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  await connectDB();

  try {
    const { userId } = await getAuthUser(req);
    const { postId } = await params;

    if (!mongoose.isValidObjectId(postId)) {
      return NextResponse.json(
        { status: false, message: "Invalid post ID" },
        { status: 400 }
      );
    }

    const post = await Posts.findById(postId).lean<PostType | null>();
    if (!post) {
      return NextResponse.json(
        { status: false, message: "Post not found" },
        { status: 404 }
      );
    }

    // Security check: only post owner can delete
    if (post?.userId?.toString() !== userId?.toString()) {
      return NextResponse.json(
        { status: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    // Delete post, comments, and reactions
    await Posts.deleteOne({ _id: postId });
    await Comments.deleteMany({ postId });
    await Reactions.deleteMany({
      targetType: "post",
      targetId: postId,
    });

    const commentIds = await Comments.find({ postId }).distinct("_id");
    await Reactions.deleteMany({
      targetType: "comment",
      targetId: { $in: commentIds },
    });

    if (Shares) {
      await Shares.deleteMany({ postId });
    }

    return NextResponse.json({
      status: true,
      message: "Post deleted successfully",
      data: {},
    });

  } catch (error) {
    console.error("DELETE POST ERROR:", error);
    return NextResponse.json(
      { status: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/community/posts/[postId]
 * Toggles like / unlike reaction for a community post.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await connectDB();

    const { postId } = await params;
    const { userId } = await getAuthUser(req);

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const post = await Posts.findById(postId);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existingReaction = await Reactions.findOne({
      targetType: "post",
      targetId: postId,
      userId
    });

    let liked: boolean;

    if (existingReaction) {
      await existingReaction.deleteOne();
      post.likesCount = Math.max(0, post.likesCount - 1);
      liked = false;
    } else {
      await Reactions.create({
        targetType: "post",
        targetId: postId,
        userId,
        type: "like"
      });

      post.likesCount += 1;
      liked = true;
    }

    await post.save();

    return NextResponse.json({
      success: true,
      liked,
      data: { likesCount: post.likesCount },
    });

  } catch (error: any) {
    console.error("LIKE ERROR:", error);

    if (error.code === 11000) {
      return NextResponse.json({
        error: "Duplicate like prevented",
        message: "User already reacted"
      }, { status: 409 });
    }

    return NextResponse.json(
      { status: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/community/posts/[postId]
 * Retrieves single post details including author info, like status, and total likes count.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  await connectDB();

  try {
    const { userId } = await getAuthUser(req);
    const { postId } = await params;

    const post = await Posts.findById(postId)
      .populate("userId", "name email image")
      .lean();

    if (!post) {
      return NextResponse.json(
        { status: false, message: "Post not found" },
        { status: 404 }
      );
    }

    const userReaction = await Reactions.findOne({
      targetType: "post",
      targetId: postId,
      userId: userId ? userId : '',
      type: "like",
    }).lean();

    const liked = !!userReaction;

    const totalLikes = await Reactions.countDocuments({
      targetType: "post",
      targetId: postId,
      type: "like",
    });

    return NextResponse.json(
      {
        status: true,
        message: "Post fetched successfully",
        data: {
          ...post,
          liked,
          likesCount: totalLikes,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET SINGLE POST ERROR:", error);
    return apiErrorResponse(error, { message: "Failed to fetch post" });
  }
}

