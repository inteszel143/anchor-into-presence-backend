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
    isTestAccount: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    deletionPending: { type: Boolean, default: false },
    deletionPlan: { type: mongoose.Schema.Types.Mixed, default: null, select: false },
  },
  { timestamps: true }
);
// Next.js hot reload can retain models compiled before this field existed.
// Update every cached alias so strict updates do not silently drop the label.
for (const name of ["User", "user", "users"]) {
  const cachedModel = mongoose.models[name];
  if (cachedModel && !cachedModel.schema.path("deletionPending")) {
    cachedModel.schema.add({ deletionPending: { type: Boolean, default: false }, deletionPlan: { type: mongoose.Schema.Types.Mixed, default: null, select: false } });
  }
  if (cachedModel && !cachedModel.schema.path("isTestAccount")) {
    cachedModel.schema.add({ isTestAccount: { type: Boolean, default: false } });
  }
}

export const User = mongoose.models.User || mongoose.model("User", UserSchema);

if (!mongoose.models.user) {
  mongoose.model("user", UserSchema);
}
if (!mongoose.models.users) {
  mongoose.model("users", UserSchema);
}
