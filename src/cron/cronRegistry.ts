import { ScheduledTask } from "node-cron";

export const cronJobRegistry = new Map<string, ScheduledTask>();
