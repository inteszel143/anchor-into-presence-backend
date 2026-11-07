import { createHash } from "node:crypto";
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

  const { productId, purchaseId, amount, purchaseDate, planType, currencySymbol, platform, purchaseToken } =
    await req.json();

  if (typeof productId !== "string" || !productId || typeof purchaseId !== "string" || !purchaseId || typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || !purchaseDate || !planType || !currencySymbol) {
    return NextResponse.json(
      { message: "All fields are required", status: false },
      { status: 400 }
    );
  }

  if ((platform !== undefined && platform !== "android" && platform !== "ios") ||
      (purchaseToken !== undefined && (platform !== "android" || typeof purchaseToken !== "string" ||
        !purchaseToken.trim() || purchaseToken.length > 8192 || /\s/.test(purchaseToken)))) {
    return NextResponse.json({ message: "Invalid purchase reporting details", status: false }, { status: 400 });
  }

  try {
    const date = new Date(purchaseDate);
    if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 300000 ||
        !["monthly", "yearly", "lifetime"].includes(planType)) {
      return NextResponse.json({ message: "Invalid purchase details", status: false }, { status: 400 });
    }
    // Transaction IDs identify delivery, not campaign usage. Restore/retry must
    // return success for the same account without inserting another purchase.
    const store = platform ?? (purchaseId.startsWith("GPA.") ? "android" : "ios");
    const deliveryKey = createHash("sha256").update(`${store}:${purchaseId}`).digest("hex");
    await UserPurchase.init(); // Ensure the unique retry key exists before writes.
    const existing = await UserPurchase.findOne({ purchaseId,
      $or: [{ platform: store }, { platform: { $exists: false } }],
    }).select("userId").lean<{ _id: unknown; userId: unknown } | null>();
    if (existing && String(existing.userId) !== String(userId)) {
      return NextResponse.json({ message: "This purchase is already associated with another account.", status: false }, { status: 409 });
    }
    const values = {
      userId, productId, purchaseId, amount, purchaseDate: date, planType,
      currencySymbol,
    };
    try {
      const saved = await UserPurchase.findOneAndUpdate(
        existing ? { _id: existing._id, userId } : { deliveryKey, userId },
        { $setOnInsert: values, $set: { deliveryKey, platform: store,
          ...(purchaseToken ? { purchaseToken } : {}),
        } },
        { upsert: true, new: true, runValidators: true },
      );
      if (String(saved.userId) !== String(userId)) {
        return NextResponse.json({ message: "This purchase is already associated with another account.", status: false }, { status: 409 });
      }
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      // Another request may win the upsert race. Only its owner can retry it.
      const saved = await UserPurchase.findOne({ deliveryKey }).select("userId").lean<{ _id: unknown; userId: unknown } | null>();
      if (!saved || String(saved.userId) !== String(userId)) {
        return NextResponse.json({ message: "This purchase is already associated with another account.", status: false }, { status: 409 });
      }
    }

    return NextResponse.json(
      { message: "Purchased successfully", data: {}, status: true },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorResponse(error, { message: "Internal server error" });
  }
}
