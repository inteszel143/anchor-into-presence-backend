import mongoose from "mongoose";
const { Schema } = mongoose;

const FavoriteActivitiesSchema = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "users", required: true },
    activityId: {type: Schema.Types.ObjectId, ref: "activities", required: true}
  },
  { timestamps: true }
);

export const FavoriteActivities =
  mongoose.models.FavoriteActivities || mongoose.model("favorite_activities", FavoriteActivitiesSchema);
