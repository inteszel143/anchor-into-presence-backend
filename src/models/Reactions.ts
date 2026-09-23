import mongoose, { Schema } from "mongoose";

const ReactionsSchema = new mongoose.Schema({
  targetType: { type: String, enum: ['post', 'comment'], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, default: 'like' }, // extend later (love, clap...)
}, { timestamps: true });

ReactionsSchema.index({ targetType: 1, targetId: 1, userId: 1 }, { unique: true });
// unique ensures single reaction per user per target
export const Reactions = mongoose.models.reactions || mongoose.model("reactions", ReactionsSchema);
