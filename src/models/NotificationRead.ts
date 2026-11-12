import mongoose, { Schema } from "mongoose";

// Read state belongs to an account, never to the shared notification itself.
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
  notificationId: { type: Schema.Types.ObjectId, required: true },
  readAt: { type: Date, default: Date.now },
});
schema.index({ userId: 1, notificationId: 1 }, { unique: true });

export const NotificationRead = mongoose.models.notification_reads || mongoose.model("notification_reads", schema);
