import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { sendNotificationToUser } from "@/lib/sendNotificationToUser";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, fcmToken, title = "Test Notification", message = "Hello from Meditation App! 🧘" } = body;

    let targetFcmToken = fcmToken;

    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json({
          status: false,
          message: `User with ID ${userId} not found`
        }, { status: 404 });
      }
      if (!user.fcmToken) {
        return NextResponse.json({
          status: false,
          message: `User with ID ${userId} does not have an FCM token registered`
        }, { status: 400 });
      }
      targetFcmToken = user.fcmToken;
    }

    if (!targetFcmToken) {
      return NextResponse.json({
        status: false,
        message: "You must provide either a 'userId' or an 'fcmToken'"
      }, { status: 400 });
    }

    const response = await sendNotificationToUser(targetFcmToken, title, message);

    return NextResponse.json({
      status: true,
      message: "Test notification sent successfully",
      data: response
    });
  } catch (error: any) {
    return apiErrorResponse(error, { message: "Error sending test notification" });
  }
}
