import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { User } from "@/models/User";
import { UserScheduleNotification } from "@/models/UserScheduleNotification";
import { scheduleReminder } from "@/cron/scheduleReminder";

export async function PATCH(req: NextRequest) {
  const identity = await getUserFromRequest(req);
  if (!identity || identity.role !== "user") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.fcmToken !== "string" || !body.fcmToken.trim() || body.fcmToken.length > 4096) return NextResponse.json({ message: "Invalid push token" }, { status: 400 });
  try {
    await connectDB();
    const user = await User.findOneAndUpdate({ _id: identity.userId, isBlocked: { $ne: true } }, { $set: { fcmToken: body.fcmToken.trim() } });
    if (!user) return NextResponse.json({ message: "Account unavailable" }, { status: 403 });
    // Recover recurring reminders previously saved without a device token.
    const reminders = await UserScheduleNotification.find({ userId: identity.userId, date: null, "weekday.0": { $exists: true } });
    for (const reminder of reminders) await scheduleReminder(reminder);
    return NextResponse.json({ status: true });
  } catch {
    return NextResponse.json({ message: "Could not register push notifications. Please retry." }, { status: 500 });
  }
}
