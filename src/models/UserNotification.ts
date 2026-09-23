import mongoose, { Schema } from "mongoose";

const UserNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    }, 
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

export const UserNotification =
  mongoose.models.UserNotification ||
  mongoose.model("user_notifications", UserNotificationSchema);
