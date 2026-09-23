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
  mongoose.models.Faq || mongoose.model("faqs", FaqSchema);
