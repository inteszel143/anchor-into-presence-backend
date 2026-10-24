import type { PipelineStage } from "mongoose";
import { SUBSCRIPTION_PLAN_DAYS } from "./adminSubscriptionStatus";

// Purchase-based estimate only: the app does not persist verified renewal,
// refund, revocation, or sandbox status for every purchase.
export function adminUserSubscriptionPipeline(purchaseCollection: string, now: Date): PipelineStage[] {
  return [
    { $lookup: {
      from: purchaseCollection,
      let: { accountId: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$userId", "$$accountId"] } } },
        { $sort: { purchaseDate: -1, _id: -1 } },
        { $limit: 1 },
        { $project: { _id: 0, planType: 1, purchaseDate: 1 } },
      ],
      as: "latestPurchase",
    } },
    { $set: { purchase: { $arrayElemAt: ["$latestPurchase", 0] } } },
    { $set: { estimatedActive: { $and: [
      { $eq: [{ $type: "$purchase.purchaseDate" }, "date"] },
      { $lte: ["$purchase.purchaseDate", now] },
      { $or: [
        { $eq: ["$purchase.planType", "lifetime"] },
        { $and: [
          { $in: ["$purchase.planType", ["monthly", "yearly"]] },
          { $gte: [{ $add: ["$purchase.purchaseDate", { $cond: [{ $eq: ["$purchase.planType", "monthly"] }, SUBSCRIPTION_PLAN_DAYS.monthly * 86400000, SUBSCRIPTION_PLAN_DAYS.yearly * 86400000] }] }, now] },
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
