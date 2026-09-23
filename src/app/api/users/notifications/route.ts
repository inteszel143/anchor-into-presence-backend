import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserNotification } from "@/models/UserNotification";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    let page = parseInt(searchParams.get("page") || "1", 10);
    if (isNaN(page) || page < 1) page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const notifications = await UserNotification.find(
      {},
      { title: 1, description: 1, createdAt: 1 }
    )
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // optional sorting, latest first

    const total = await UserNotification.countDocuments();

    return NextResponse.json({
      data: notifications,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return apiErrorResponse(error, { message: "Internal Server Error" });
  }
}
