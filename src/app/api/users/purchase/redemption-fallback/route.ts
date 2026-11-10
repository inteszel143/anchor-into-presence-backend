import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { User } from "@/models/User";
import { apiErrorResponse } from "@/lib/apiResponse";

// Business-authorized complimentary access, NOT proof of an Apple redemption.
// Any signed-in eligible account can claim once. Retries never extend the year.
export async function POST(req: NextRequest) {
  const session = await getUserFromRequest(req);
  if (!session?.userId) {
    return NextResponse.json({ message: "Unauthorized", status: false }, { status: 401 });
  }
  try {
    await connectDB();
    const now = new Date();
    await User.updateOne({
      _id: session.userId,
      isBlocked: { $ne: true },
      deletionPending: { $ne: true },
      redemptionYearlyExpiresAt: null,
    }, { $set: {
      redemptionYearlyGrantedAt: now,
      redemptionYearlyExpiresAt: new Date(now.getTime() + 365 * 86400000),
    } });
    const user = await User.findById(session.userId)
      .select("isBlocked deletionPending redemptionYearlyExpiresAt")
      .lean<{ isBlocked?: boolean; deletionPending?: boolean; redemptionYearlyExpiresAt?: Date } | null>();
    if (!user || user.isBlocked || user.deletionPending) {
      return NextResponse.json({ message: "Account unavailable", status: false }, { status: 403 });
    }
    if (!user.redemptionYearlyExpiresAt || new Date(user.redemptionYearlyExpiresAt) <= now) {
      return NextResponse.json({ message: "The complimentary year has expired", status: false }, { status: 409 });
    }
    return NextResponse.json({ status: true, data: {
      planType: "yearly", source: "complimentary",
      expiresAt: user.redemptionYearlyExpiresAt,
    } });
  } catch (error) {
    return apiErrorResponse(error, { message: "Could not activate yearly access" });
  }
}
