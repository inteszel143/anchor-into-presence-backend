import mongoose, { Schema } from "mongoose";
import { nanoid } from "nanoid";

const PostsSchema = new mongoose.Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, default: "" },

  postType: {
    type: String,
    enum: ["Reflection", "Questions", "Encouragement"],
    default: "",
    // default: "Reflection",
  },

  images: [{ type: String }],
  postAnonymously: { type: Boolean, default: false },

  // Public shareable ID (safe, not exposing _id)
  shareId: {
    type: String,
    unique: true,
    index: true,
  },

  // Denormalized counters
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },

  topReactors: [{ userId: Schema.Types.ObjectId, image: String, name: String }],
}, { timestamps: true });


// 🔥 Automatically generate shareId if missing
PostsSchema.pre("save", function (next) {
  if (!this.shareId) {
    this.shareId = nanoid(12); // generate 12-char public ID
  }
  next();
});

export interface PostType {
  _id: string;
  shareId: string;
  userId: string | mongoose.Types.ObjectId;
  message: string;
  postType: string;
  image: string[];
  postAnonymously: boolean;
  createdAt: Date;
  updatedAt: Date;  
}

PostsSchema.index({ createdAt: -1 });
PostsSchema.index({ postType: 1, createdAt: -1 });

export const Posts =
  mongoose.models.posts || mongoose.model("posts", PostsSchema);
