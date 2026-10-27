import { UserScheduleNotification } from "@/models/UserScheduleNotification";
import { ScheduledCronJob } from "@/models/ScheduledCronJob";
import { scheduleReminder } from "./scheduleReminder";

export async function restoreCronJobs() {
  // Rebuild from reminders, including ones saved before push registration.
  const reminders = await UserScheduleNotification.find();
  for (const reminder of reminders) {
    try {
      if (reminder.date) {
        const [hours, minutes] = reminder.time.split(":").map(Number);
        const due = new Date(reminder.date);
        due.setHours(hours, minutes, 0, 0);
        if (due < new Date()) {
          await ScheduledCronJob.deleteOne({ reminderId: reminder._id });
          continue;
        }
      }
      await scheduleReminder(reminder);
    } catch (error) {
      console.error("Could not restore reminder", String(reminder._id), error);
    }
  }
}
