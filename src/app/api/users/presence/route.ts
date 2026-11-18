import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { User } from "@/models/User";
import { apiErrorResponse } from "@/lib/apiResponse";

const headers = { "Cache-Control": "private, no-store" };

/** Foreground heartbeat. Identity and time are never accepted from the body. */
export async function POST(req: NextRequest) {
  try {
    const identity = await getUserFromRequest(req);
    if (!identity || identity.role !== "user" || typeof identity.userId !== "string" || !mongoose.isValidObjectId(identity.userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers });
    }
    await connectDB();
    const now = new Date();
    const result = await User.updateOne(
      { _id: identity.userId, isBlocked: { $ne: true }, deletionPending: { $ne: true } },
      { $max: { lastSeenAt: now } },
      { timestamps: false },
    );
    if (!result.matchedCount) {
      return NextResponse.json({ message: "Account unavailable" }, { status: 403, headers });
    }
    return NextResponse.json({ lastSeenAt: now.toISOString() }, { headers });
  } catch (error) {
    return apiErrorResponse(error, { message: "Could not record app activity." });
  }
}
