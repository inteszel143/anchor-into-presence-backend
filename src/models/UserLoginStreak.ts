import mongoose, { Schema } from "mongoose";

const UserLoginStreakSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    loginDates: {
      type: [Date],
      default: [],
    },
  },
  { timestamps: true }
);
export const UserLoginStreak = mongoose.models.user_login_streaks || mongoose.model("user_login_streaks", UserLoginStreakSchema);
