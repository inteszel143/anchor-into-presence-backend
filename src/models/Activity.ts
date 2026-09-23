import mongoose from "mongoose";
const { Schema } = mongoose;

const ActivitySchema = new mongoose.Schema(
  {
    name: String,
    video: String, // can be audio or video or image
    thumbnail: String,
    duration: String,
    description: String,
    schedulePublish: { type: Boolean, default: false },
    schedulePublishDate: String,
    schedulePublishTime: String,
    scheduleDate: String,
    scheduleTime: String,
    contentId: String,
    contentType: String,
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    tags: [
      {
        type: Schema.Types.ObjectId,
        ref: "tags", // Reference to the itemTags model
      },
    ],
    status: { type: Number, default: 1 }, // 0 in-active & 1 active
  },
  { timestamps: true }
);

export const Activity =
  mongoose.models.Activity || mongoose.model("Activity", ActivitySchema);
