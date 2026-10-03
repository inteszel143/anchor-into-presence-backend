import mongoose from "mongoose"
const FaqSchema = new mongoose.Schema(
  {
    question: String,
    answer: String, 
    status: {type: Number, default: 1}// 0 in-active & 1 active
  },
  { timestamps: true }
);

export const Faq =
  mongoose.models.faqs || mongoose.model("faqs", FaqSchema);
