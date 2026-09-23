import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    status: { type: Number, default: 1 }, // 0 in-active & 1 active
  },
  { timestamps: true }
);

export const Category =
  mongoose.models.Category || mongoose.model("Category", CategorySchema);
