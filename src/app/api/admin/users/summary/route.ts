import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { UserPurchase } from "@/models/UserPurchase";
import { adminUserSummaryPipeline } from "@/lib/adminUserSummary";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    await connectDB();
    const [summary] = await User.aggregate(adminUserSummaryPipeline(UserPurchase.collection.name, new Date()));
    return NextResponse.json(summary ?? { totalAccounts: 0, testAccounts: 0, estimatedActiveSubscriptions: 0 }, { headers });
  } catch {
    return NextResponse.json({ message: "Couldn’t load account totals. Please try again." }, { status: 500, headers });
  }
}
