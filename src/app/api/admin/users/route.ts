import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { UserPurchase } from "@/models/UserPurchase";
import { estimateAdminSubscription } from "@/lib/adminSubscriptionStatus";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  let page = parseInt(searchParams.get("page") || "1", 10);
  if (isNaN(page) || page < 1) page = 1;
  let limit = parseInt(searchParams.get("limit") || "10", 10);
  if (isNaN(limit) || limit < 1) limit = 10;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select("name email isBlocked isTestAccount createdAt")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // One batch query for this page, using the same latest-purchase rule as totals.
  const purchases = users.length ? await UserPurchase.aggregate([
    { $match: { userId: { $in: users.map(user => user._id) } } },
    { $sort: { purchaseDate: -1, _id: -1 } },
    { $group: { _id: "$userId", planType: { $first: "$planType" }, purchaseDate: { $first: "$purchaseDate" } } },
  ]) : [];
  const byUser = new Map(purchases.map(purchase => [String(purchase._id), purchase]));
  const now = new Date();

  return NextResponse.json({
    users: users.map(user => ({ ...user, subscription: estimateAdminSubscription(byUser.get(String(user._id)), now) })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
