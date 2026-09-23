import mongoose from "mongoose";
const { Schema } = mongoose;

const UserActivityLogsSchema = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
    videoTimestamp: String,
    totalVideoTime: String,
    isCompleted: Boolean,
    activityId: {type: Schema.Types.ObjectId, ref: "activities", required: true}
  },
  { timestamps: true }
);

export const UserActivityLogs =
  mongoose.models.UserActivityLogs || mongoose.model("user_activity_logs", UserActivityLogsSchema);
