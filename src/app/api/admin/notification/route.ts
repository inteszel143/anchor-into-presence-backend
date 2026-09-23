import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiResponse";
import { connectDB } from "@/lib/db";
import { UserNotification } from "@/models/UserNotification";
import { User } from "@/models/User"; // Your User model
import { messaging } from "@/lib/firebaseAdmin"; // Firebase Admin Messaging instance

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { title, description } = body;

    if (!title || !description) {
      return NextResponse.json(
        { message: "Title and description are required", status: false },
        { status: 400 }
      );
    }

    // 1. Save the notification to DB
    await UserNotification.create({ title, description });

    // 2. Get all users with FCM tokens
    const users = await User.find({
      fcmToken: { $exists: true, $ne: null },
      isBlocked: false,
      isVerified: true,
      notificationReceive: true,
    }).select("fcmToken");
    console.log(users)

    // 3. Send push notification to each user
    const messages = users.map((user: any) => ({
      token: user.fcmToken,
      notification: {
        title,
        body: description,
      },
      android: {
        notification: {
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    }));

    // Send in batches (optional but efficient)
    const results = await Promise.allSettled(
      messages.map((msg) => messaging.send(msg))
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      message: `Notification sent successfully.`,
      data: {},
      status: true,
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return apiErrorResponse(error, { message: "Internal Server Error" });
  }
}
