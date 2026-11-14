import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { User } from "@/models/User";
import { Posts } from "@/models/Posts";
import { apiErrorResponse } from "@/lib/apiResponse";

const headers = { "Cache-Control": "private, no-store" };

async function activity(req: NextRequest, markVisited: boolean) {
  try {
    const identity = await getUserFromRequest(req);
    if (!identity || identity.role !== "user" || typeof identity.userId !== "string" || !mongoose.isValidObjectId(identity.userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers });
    }
    const now = new Date();
    let visitedThrough: Date | undefined;
    if (markVisited) {
      const body = await req.json().catch(() => null);
      visitedThrough = typeof body?.visitedThrough === "string" ? new Date(body.visitedThrough) : undefined;
      if (!visitedThrough || !Number.isFinite(visitedThrough.getTime()) || visitedThrough > now) {
        return NextResponse.json({ message: "A valid feed timestamp is required." }, { status: 400, headers });
      }
    }
    await connectDB();
    // Establish a baseline once: existing posts are not a backlog for new users.
    await User.updateOne({ _id: identity.userId, communityVisitedAt: null }, { $set: { communityVisitedAt: visitedThrough ?? now } });
    if (visitedThrough) {
      // Delayed requests from another device must never move the marker backwards.
      await User.updateOne({ _id: identity.userId }, { $max: { communityVisitedAt: visitedThrough } });
    }
    const user = await User.findById(identity.userId).select("communityVisitedAt").lean<{ communityVisitedAt: Date }>();
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404, headers });
    const counts = await Posts.aggregate([
      { $match: { createdAt: { $gt: user.communityVisitedAt }, userId: { $ne: new mongoose.Types.ObjectId(identity.userId) } } },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "author" } },
      { $unwind: "$author" },
      { $count: "total" },
    ]);
    return NextResponse.json({ newPostCount: counts[0]?.total ?? 0 }, { headers });
  } catch (error) {
    return apiErrorResponse(error, { message: "Could not update community activity." });
  }
}

export const GET = (req: NextRequest) => activity(req, false);
export const PATCH = (req: NextRequest) => activity(req, true);
