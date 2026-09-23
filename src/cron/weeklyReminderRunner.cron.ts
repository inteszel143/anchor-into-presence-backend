import cron from "node-cron";
import { scheduleReminder } from "./scheduleReminder";
import { UserScheduleNotification } from "../models/UserScheduleNotification";

/**
 * Scans all user scheduled notifications in MongoDB that belong to active users with an FCM token,
 * and re-schedules active weekly reminders.
 */
export async function startWeeklyReminderRunner() {
  console.log("[CRON] Weekly reminder scan started");

  const reminders = await UserScheduleNotification.aggregate([
    {
      // 1️⃣ Join users collection
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      // 2️⃣ Flatten user array
      $unwind: "$user",
    },
    {
      // 3️⃣ Only users with non-null FCM token
      $match: {
        "user.fcmToken": { $exists: true, $ne: null },
      },
    },
  ]);

  for (const reminder of reminders) {
    await scheduleReminder(reminder, reminder.user.fcmToken);
  }

  console.log("[CRON] Weekly reminder scan completed");
}

