import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    image: String,
    socialId: String,
    provider: { type: String, default: "credentials" },
    isVerified: { type: Boolean, default: false },
    resetPassword: { type: Boolean, default: false },
    userMood: String,
    otp: String,
    otpExpiresAt: Date,
    fcmToken: String,
    notificationReceive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const User = mongoose.models.User || mongoose.model("User", UserSchema);

if (!mongoose.models.user) {
  mongoose.model("user", UserSchema);
}
if (!mongoose.models.users) {
  mongoose.model("users", UserSchema);
}
