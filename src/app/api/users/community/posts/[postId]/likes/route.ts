import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Posts } from "@/models/Posts";
import { Reactions } from "@/models/Reactions";
import "@/models/User";
import { apiErrorResponse } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  await connectDB();

  try {
    const resolvedParams = await params;
    const { postId } = resolvedParams;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return apiErrorResponse('Invalid post ID')
    }

    const postExists = await Posts.exists({ _id: postId });
    if (!postExists) {
      return apiErrorResponse('Post not found')
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const rawLimit = Number(searchParams.get("limit")) || 10;
    // Enforce maximum limit of 10
    const limit = Math.min(Math.max(1, rawLimit), 10);
    const skip = (page - 1) * limit;

    const filter = {
      targetType: "post",
      targetId: new mongoose.Types.ObjectId(postId),
      type: "like",
    };

    const totalLikes = await Reactions.countDocuments(filter);

    const reactions = await Reactions.find(filter)
      .populate("userId", "name email image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Clean list filtering out deleted users
    const likes = reactions
      .filter((reaction: any) => reaction.userId !== null)
      .map((reaction: any) => ({
        _id: reaction._id,
        user: reaction.userId,
        createdAt: reaction.createdAt,
      }));

    return NextResponse.json(
      {
        status: true,
        message: "Post likes fetched successfully",
        data: likes,
        pagination: {
          page,
          limit,
          totalLikes,
          totalPages: Math.ceil(totalLikes / limit) || 1,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET POST LIKES ERROR:", error);
    return NextResponse.json(
      { status: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
