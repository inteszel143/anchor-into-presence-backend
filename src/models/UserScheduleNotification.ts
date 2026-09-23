import mongoose, { Schema } from "mongoose";

const UserScheduleNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    weekday: {
      type: [Number], // 0 (Sunday) to 6 (Saturday)
      default: [],
    },
    time: { type: String, required: true }, // in HH:mm format (24-hour clock)
    date: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const UserScheduleNotification =
  mongoose.models.user_schedule_notifications ||
  mongoose.model("user_schedule_notifications", UserScheduleNotificationSchema);
