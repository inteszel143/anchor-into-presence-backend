import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { UserScheduleNotification } from "@/models/UserScheduleNotification";
import { getAuthUser } from "@/lib/getAuthUser";
import { User } from "@/models/User";
import { scheduleReminder } from "@/cron/scheduleReminder";
import { apiErrorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  await connectDB();

  const { userId } = await getAuthUser(req);
  const body = await req.json();
  const { time, weekday = [], date } = body;

  // Validation: Either weekday OR date must be provided, not both
  if ((!weekday.length && !date) || (weekday.length && date)) {
    return NextResponse.json(
      {
        message: "You must provide either weekday(s) or a date (not both)",
        status: false,
        data: {},
      },
      { status: 400 }
    );
  }

  try {
    // Upsert one reminder per user
    const reminder = await UserScheduleNotification.create({
      userId,
      time,
      weekday,
      date: date ? new Date(date) : null,
    });

    const user = await getAuthUser(req); // Or fetch fresh user to get fcmToken
    const userRecord = await User.findById(userId);
    if (userRecord?.fcmToken) {
      await scheduleReminder(reminder, userRecord.fcmToken);
    }

    return NextResponse.json({
      message: "Reminder set successfully",
      data: reminder,
      status: true,
    });
  } catch (error) {
    return apiErrorResponse(error, { message: "Error setting reminder" });
  }
}

export async function GET(req: NextRequest) {
  await connectDB();

  const { userId } = await getAuthUser(req);

  try {
    const reminder = await UserScheduleNotification.find({ userId }).sort({
      createdAt: -1,
    }); // descending (latest first)

    return NextResponse.json({
      message: "Reminder fetched successfully",
      data: reminder,
      status: true,
    });
  } catch (error) {
    return apiErrorResponse(error, { message: "Error setting reminder" });
  }
}
