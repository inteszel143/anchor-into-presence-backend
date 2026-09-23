import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { User } from "@/models/User";
import { UserPurchase } from "@/models/UserPurchase";
import mongoose from "mongoose";

/**
 * GET /api/users/profile
 * Retrieves authenticated user profile along with subscription status (active/expired/not bought)
 * and purchase information.
 */
export async function GET(req: NextRequest) {
  await connectDB();

  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userProfile = await User.findById(user.userId)
    .select("-password")
    .lean();

  if (!userProfile) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // Fetch latest purchase
  const latestPurchase = await UserPurchase.findOne({
    userId: new mongoose.Types.ObjectId(user.userId as string),
  })
    .sort({ purchaseDate: -1 })
    .lean() as { planType: string; purchaseDate: Date; productId: string } | null;

  // Determine subscription status
  let subscriptionStatus = "not bought";

  if (latestPurchase) {
    const planDays = latestPurchase.planType === "monthly" ? 30 : 365;
    const expiryDate = new Date(
      new Date(latestPurchase.purchaseDate).getTime() +
      planDays * 24 * 60 * 60 * 1000
    );

    if (expiryDate >= new Date()) {
      subscriptionStatus = "active";
    } else {
      subscriptionStatus = "expired";
    }
  }

  return NextResponse.json({
    message: "Profile fetched",
    data: { ...userProfile, subscriptionStatus, productId: latestPurchase?.productId },
    status: true,
  });
}

