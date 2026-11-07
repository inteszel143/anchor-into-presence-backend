import mongoose, { Schema } from "mongoose";

const UserPurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    // Only new/reconciled writes have this key, so legacy duplicate rows do not
    // prevent creating the unique index needed for concurrent retries.
    deliveryKey: { type: String, select: false },
    purchaseId: {
      type: String,
    },
    productId: {
      type: String,
    },
    platform: { type: String, enum: ["android", "ios"] },
    // Server-side Google reporting only. Never include tokens in user history.
    purchaseToken: { type: String, select: false },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "activity",
    },
    amount: {
      type: Number,
      required: true,
    },
    currencySymbol: {
      type: String,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    planType: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"],
      required: true,
    },
  },
  { timestamps: true }
);
UserPurchaseSchema.index({ deliveryKey: 1 }, {
  unique: true,
  partialFilterExpression: { deliveryKey: { $type: "string" } },
});
export const UserPurchase = mongoose.models.user_purchase || mongoose.model("user_purchase", UserPurchaseSchema);
