import { ScheduledCronJob } from "@/models/ScheduledCronJob";
import { cronJobRegistry } from "./cronRegistry";
import { UserScheduleNotification } from "@/models/UserScheduleNotification";

export async function deleteReminder(reminderId: string) {
  try {
    const cronJob = await ScheduledCronJob.findOne({ reminderId });

    if (cronJob) {
      const task = cronJobRegistry.get(cronJob.jobKey);

      if (task) {
        task.stop();
        cronJobRegistry.delete(cronJob.jobKey);
      }

      await ScheduledCronJob.deleteOne({ reminderId });
    }

    await UserScheduleNotification.findByIdAndDelete(reminderId);
  } catch (error) {
    throw error;
  }
}
