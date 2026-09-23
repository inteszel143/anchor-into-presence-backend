import mongoose from "mongoose";

const TagSchema = new mongoose.Schema(
  {
    name: String,
  },
  { timestamps: true }
);
export const Tags = mongoose.models.tags || mongoose.model("tags", TagSchema);
