import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser } from "@/lib/getAuthUser";
import { UserPurchase } from "@/models/UserPurchase";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  await connectDB();

  const { userId } = await getAuthUser(req);

  try {
    const { searchParams } = req.nextUrl;

    let page = parseInt(searchParams.get("page") || "1", 10);
    if (isNaN(page) || page < 1) page = 1;
    let limit = parseInt(searchParams.get("limit") || "10", 10);
    if (isNaN(limit) || limit < 1) limit = 10;
    const query = searchParams.get("q") || "";

    const skip = (page - 1) * limit;

    // Build filter
    const filter = {
      userId, // ensure only this user's data
      ...(query && { name: { $regex: query, $options: "i" } }), // optional search
    };

    // Fetch data + count in parallel
    const [PurchaseHistory, total] = await Promise.all([
      UserPurchase.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserPurchase.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      message: "User purchase for today",
      data: PurchaseHistory,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      status: true,
    });
  } catch (error) {
    return apiErrorResponse(error, { message: "Error fetching purchase history" });
  }
}

export async function POST(req: NextRequest) {
  await connectDB();

  const { userId } = await getAuthUser(req);

  const { productId, purchaseId, activityId, amount, purchaseDate, planType, currencySymbol } =
    await req.json();

  if (!productId || !purchaseId || !amount || !purchaseDate || !planType || !currencySymbol) {
    return NextResponse.json(
      { message: "All fields are required", status: false },
      { status: 400 }
    );
  }

  try {
    await UserPurchase.create({
      userId,
      productId,
      purchaseId,
      amount,
      purchaseDate,
      planType,
      currencySymbol,
    });

    return NextResponse.json(
      { message: "Purchased successfully", data: {}, status: true },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, { message: "Internal server error" });
  }
}
