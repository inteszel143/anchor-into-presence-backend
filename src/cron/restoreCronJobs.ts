import { ScheduledCronJob } from "../models/ScheduledCronJob";
import { User } from "../models/User";
import { cronJobRegistry } from "./cronRegistry";
import { sendNotificationToUser } from "../lib/sendNotificationToUser";
import cron from "node-cron";
import mongoose from "mongoose";

export async function restoreCronJobs() {

  await import("../models/UserScheduleNotification");
  await import("../models/ScheduledCronJob");
  await import("../models/User");

  // Populate reminderId and nested userId to get the FCM Token
  const jobs = await ScheduledCronJob.find().populate({
    path: "reminderId",
    populate: { path: "userId" }
  });


  for (const job of jobs) {
    const reminder = job.reminderId as any;
    if (!reminder) continue;

    // If it's a one-time date-specific reminder, check if it's already in the past
    if (reminder.date) {
      const [hours, minutes] = reminder.time.split(":").map(Number);
      const reminderDate = new Date(reminder.date);
      reminderDate.setHours(hours, minutes, 0, 0);

      if (reminderDate < new Date()) {
        // Already in the past, clean up the job entry from database
        await ScheduledCronJob.deleteOne({ _id: job._id });
        continue;
      }
    }

    const user = reminder.userId;
    if (!user) continue;

    const task = cron.schedule(job.cronExpression, async () => {
      try {
        const freshUser = await User.findById(user._id);
        if (freshUser && freshUser.fcmToken && freshUser.notificationReceive !== false) {
          await sendNotificationToUser(
            freshUser.fcmToken,
            "Reminder",
            "You have a scheduled reminder ⏰"
          );
        }
        console.log("Cron notification success during restore");
      } catch (err) {
        console.error("Cron notification failure during restore:", err);
      }
      if (reminder.date) {
        task.stop();
        cronJobRegistry.delete(job.jobKey);
        await ScheduledCronJob.deleteOne({ reminderId: reminder._id });
      }
    });

    cronJobRegistry.set(job.jobKey, task);
  }
}
