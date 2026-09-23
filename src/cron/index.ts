import { restoreCronJobs } from "./restoreCronJobs";
import { startWeeklyReminderRunner } from "./weeklyReminderRunner.cron";

export async function initCrons() {
  await restoreCronJobs();
  startWeeklyReminderRunner();
}

initCrons();
