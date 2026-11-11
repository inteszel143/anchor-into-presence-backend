import { MONTHLY_PRODUCT_IDS, YEARLY_PRODUCT_IDS } from "./subscriptionPlan";
import type { PipelineStage } from "mongoose";
import { SUBSCRIPTION_PLAN_DAYS } from "./adminSubscriptionStatus";

// Include explicit complimentary access alongside purchase-based estimates.
// Purchases still lack verified renewal/refund/revocation status.
export function adminUserSubscriptionPipeline(purchaseCollection: string, now: Date): PipelineStage[] {
  return [
    { $lookup: {
      from: purchaseCollection,
      let: { accountId: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$userId", "$$accountId"] } } },
        { $sort: { purchaseDate: -1, _id: -1 } },
        { $limit: 1 },
        { $set: { planType: { $switch: {
          branches: [
            { case: { $in: ["$productId", MONTHLY_PRODUCT_IDS] }, then: "monthly" },
            { case: { $in: ["$productId", YEARLY_PRODUCT_IDS] }, then: "yearly" },
          ], default: "$planType",
        } } } },
        { $project: { _id: 0, planType: 1, productId: 1, purchaseDate: 1 } },
      ],
      as: "latestPurchase",
    } },
    { $set: { purchase: { $arrayElemAt: ["$latestPurchase", 0] } } },
    { $set: { estimatedActive: { $or: [
      { $and: [
        { $eq: [{ $type: "$redemptionYearlyExpiresAt" }, "date"] },
        { $gt: ["$redemptionYearlyExpiresAt", now] },
      ] },
      { $and: [
        { $eq: [{ $type: "$purchase.purchaseDate" }, "date"] },
        { $lte: ["$purchase.purchaseDate", now] },
        { $or: [
          { $eq: ["$purchase.planType", "lifetime"] },
          { $and: [
            { $in: ["$purchase.planType", ["monthly", "yearly"]] },
            { $gte: [{ $add: ["$purchase.purchaseDate", { $cond: [{ $eq: ["$purchase.planType", "monthly"] }, SUBSCRIPTION_PLAN_DAYS.monthly * 86400000, SUBSCRIPTION_PLAN_DAYS.yearly * 86400000] }] }, now] },
          ] },
        ] },
      ] },
    ] } } },
  ];
}

export function adminUserSummaryPipeline(purchaseCollection: string, now: Date): PipelineStage[] {
  return [
    ...adminUserSubscriptionPipeline(purchaseCollection, now),
    { $group: {
      _id: null,
      totalAccounts: { $sum: 1 },
      testAccounts: { $sum: { $cond: [{ $eq: ["$isTestAccount", true] }, 1, 0] } },
      estimatedActiveSubscriptions: { $sum: { $cond: [{ $and: [
        { $ne: [{ $ifNull: ["$isTestAccount", false] }, true] },
        "$estimatedActive",
      ] }, 1, 0] } },
    } },
    { $project: { _id: 0, totalAccounts: 1, testAccounts: 1, estimatedActiveSubscriptions: 1 } },
  ];
}
