import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserNotification } from "@/models/UserNotification";
import { apiErrorResponse } from "@/lib/apiResponse";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { NotificationRead } from "@/models/NotificationRead";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  try {
    const identity = await getUserFromRequest(req);
    if (!identity || identity.role !== "user") return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers });
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
      .sort({ createdAt: -1, _id: -1 }).lean();

    const readIds = await NotificationRead.distinct("notificationId", { userId: identity.userId });
    const read = new Set(readIds.map(String));
    const [total, unreadCount] = await Promise.all([
      UserNotification.countDocuments(),
      UserNotification.countDocuments({ _id: { $nin: readIds } }),
    ]);

    return NextResponse.json({
      data: notifications.map(notification => ({ ...notification, isRead: read.has(String(notification._id)) })),
      unreadCount,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    }, { headers });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return apiErrorResponse(error, { message: "Internal Server Error" });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const identity = await getUserFromRequest(req);
    if (!identity || identity.role !== "user") return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers });
    const body = await req.json().catch(() => null);
    const id = body?.notificationId;
    if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ message: "A valid notification ID is required." }, { status: 400, headers });
    }
    await connectDB();
    if (!await UserNotification.exists({ _id: id })) return NextResponse.json({ message: "Notification not found." }, { status: 404, headers });
    try {
      await NotificationRead.updateOne({ userId: identity.userId, notificationId: id }, { $setOnInsert: { readAt: new Date() } }, { upsert: true });
    } catch (error) {
      // Concurrent taps/devices can race the unique index; both mean read.
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    const readIds = await NotificationRead.distinct("notificationId", { userId: identity.userId });
    const unreadCount = await UserNotification.countDocuments({ _id: { $nin: readIds } });
    return NextResponse.json({ notificationId: id, isRead: true, unreadCount }, { headers });
  } catch (error) {
    return apiErrorResponse(error, { message: "Could not mark notification as read." });
  }
}
