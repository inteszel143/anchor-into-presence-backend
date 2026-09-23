import cron from "node-cron";
import { cronJobRegistry } from "./cronRegistry";
import { ScheduledCronJob } from "../models/ScheduledCronJob";
import { sendNotificationToUser } from "../lib/sendNotificationToUser";
import {
  buildDateCronExpression,
  buildWeeklyCronExpression,
} from "../lib/helperMethods";
import { User } from "@/models/User";

export async function scheduleReminder(reminder: any, fcmToken: string) {
  try {

    const jobKey = `reminder-${reminder._id}`;
    const isTaskRunning = cronJobRegistry.has(jobKey);
    if (isTaskRunning) return; // Already running in memory
    const existing = await ScheduledCronJob.findOne({ reminderId: reminder._id });

    let cronExpression: string;
    let isOneTime = false;
    /**
     * 📅 Date-specific reminder
     */
    if (reminder.date) {
      const [hours, minutes] = reminder.time.split(":").map(Number);

      const reminderDate = new Date(reminder.date);
      reminderDate.setHours(hours, minutes, 0, 0);

      cronExpression = buildDateCronExpression(reminderDate);
      console.log("Date specific reminder cron expression:", cronExpression);
      isOneTime = true;
    } else if (reminder.weekday?.length) {
      /**
       * 📆 Weekly reminder
       */
      cronExpression = buildWeeklyCronExpression(
        reminder.weekday,
        reminder.time
      );
    }

    // ❌ Invalid reminder
    else {
      return;
    }

    const task = cron.schedule(cronExpression, async () => {
      try {
        const user = await User.findById(reminder.userId);

        // Check if user exists, has a token, and notifications are turned on
        if (user && user.fcmToken && user.notificationReceive !== false) {
          await sendNotificationToUser(
            user.fcmToken,
            "Reminder",
            "You have a scheduled reminder ⏰"
          );
        }
      } catch (err) {
        console.error("Error executing scheduled reminder cron:", err);
      }
      if (isOneTime) {
        task.stop();
        cronJobRegistry.delete(jobKey);
        await ScheduledCronJob.deleteOne({ reminderId: reminder._id });
      }
    });

    cronJobRegistry.set(jobKey, task);

    console.log("Reminder date:", reminder.date);
    console.log("Reminder time:", reminder.time);

    console.log("Cron expression:", cronExpression);

    if (!existing) {
      await ScheduledCronJob.create({
        userId: reminder.userId,
        reminderId: reminder._id,
        cronExpression,
        jobKey,
      });
    } else if (existing.cronExpression !== cronExpression) {
      existing.cronExpression = cronExpression;
      await existing.save();
    }
  } catch (error) {
    throw error;
  }
}
