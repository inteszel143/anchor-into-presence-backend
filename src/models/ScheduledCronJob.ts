import mongoose, { Schema } from "mongoose";

const ScheduledCronJobSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    reminderId: {
      type: Schema.Types.ObjectId,
      ref: "user_schedule_notifications",
      required: true,
      unique: true, // only one cron per reminder
    },
    cronExpression: {
      type: String,
      required: true,
    },
    jobKey: {
      type: String,
      required: true, // used to stop the cron
    },
  },
  { timestamps: true }
);

export const ScheduledCronJob =
  mongoose.models.scheduled_cron_jobs ||
  mongoose.model("scheduled_cron_jobs", ScheduledCronJobSchema);
