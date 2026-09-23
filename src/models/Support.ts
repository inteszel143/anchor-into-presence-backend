import mongoose, { Schema } from "mongoose";

const SupportSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String
    },
    status: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);
export const Support = mongoose.models.user_login_streaks || mongoose.model("support", SupportSchema);
