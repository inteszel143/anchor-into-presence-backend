import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { User } from "@/models/User";
import { Posts } from "@/models/Posts";

const headers = { "Cache-Control": "private, no-store" };
export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const identity = await getUserFromRequest(req);
    if (!identity?.userId || identity.role !== "user") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers });
    }
    const { postId } = await params;
    if (!mongoose.isObjectIdOrHexString(postId)) {
      return NextResponse.json({ message: "Invalid post" }, { status: 400, headers });
    }
    await connectDB();
    const viewer = await User.findById(identity.userId).select("isBlocked deletionPending").lean<{ isBlocked?: boolean; deletionPending?: boolean } | null>();
    if (!viewer || viewer.isBlocked || viewer.deletionPending) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers });
    }
    const post = await Posts.findOne({ _id: postId, postAnonymously: { $ne: true } })
      .select("userId").lean<{ userId: mongoose.Types.ObjectId } | null>();
    const author = post && await User.findOne({
      _id: post.userId, isBlocked: { $ne: true }, deletionPending: { $ne: true },
    }).select("name image createdAt").lean<{ _id: mongoose.Types.ObjectId; name?: string; image?: string; createdAt?: Date } | null>();
    if (!author) {
      return NextResponse.json({ message: "Profile unavailable" }, { status: 404, headers });
    }
    const publicPostCount = await Posts.countDocuments({ userId: author._id, postAnonymously: { $ne: true } });
    return NextResponse.json({ status: true, data: {
      name: author.name || "Community member", image: author.image || null,
      memberSince: author.createdAt || null, publicPostCount,
    } }, { headers });
  } catch {
    return NextResponse.json({ message: "Could not load profile" }, { status: 500, headers });
  }
}
