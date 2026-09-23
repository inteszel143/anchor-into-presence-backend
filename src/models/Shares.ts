import mongoose, { Schema } from "mongoose";

const SharesSchema = new mongoose.Schema({
  postId: { type: Schema.Types.ObjectId, ref: 'posts', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  meta: { type: Object }, // optional: where shared, caption, privacy
}, { timestamps: true });

SharesSchema.index({ postId: 1 });
export const Shares = mongoose.models.shares || mongoose.model("shares", SharesSchema);
