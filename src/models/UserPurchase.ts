import mongoose, { Schema } from "mongoose";

const UserPurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    purchaseId: {
      type: String,
    },
    productId: {
      type: String,
    },
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
export const UserPurchase = mongoose.models.user_purchase || mongoose.model("user_purchase", UserPurchaseSchema);
