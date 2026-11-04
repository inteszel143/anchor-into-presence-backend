import mongoose from "mongoose";

const AppSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    android_version: { type: String, default: "" },
    ios_version: { type: String, default: "" },
    android_is_approved: { type: Boolean, default: false },
    ios_is_approved: { type: Boolean, default: false },
    is_under_maintenance: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AppSettings =
  mongoose.models.app_settings ||
  mongoose.model("app_settings", AppSettingsSchema, "app_settings");
