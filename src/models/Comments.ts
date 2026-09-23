import mongoose, { Schema } from "mongoose";
import { Types } from "mongoose";


const CommentsSchema = new mongoose.Schema({
  postId: { type: Schema.Types.ObjectId, ref: "posts", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

  parentCommentId: { type: Schema.Types.ObjectId, ref: "comments", default: null },
  message: { type: String, required: true },
  likedBy: {},

  likesCount: { type: Number, default: 0 },
  repliesCount: { type: Number, default: 0 },
}, { timestamps: true });

export interface CommentType {
  liked?: boolean;
  _id: string | Types.ObjectId;
  postId: string | Types.ObjectId;
  userId: {
    name: string;
    image: string;
  };
  parentCommentId?: string | Types.ObjectId | null;
  message: string;  // <-- FIXED (was content)
  likesCount: number;
  repliesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

CommentsSchema.index({ postId: 1, createdAt: -1 });
CommentsSchema.index({ parentCommentId: 1, createdAt: -1 });
export const Comments = mongoose.models.comments || mongoose.model("comments", CommentsSchema);
