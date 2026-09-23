import mongoose from "mongoose";

const ContentSchema = new mongoose.Schema(
  {
    description: String,
    contentType: String, // 0 in-active & 1 active
  },
  { timestamps: true }
);

export const Content =
  mongoose.models.Content || mongoose.model("contents", ContentSchema);
