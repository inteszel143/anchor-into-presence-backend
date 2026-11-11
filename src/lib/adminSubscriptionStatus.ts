import { subscriptionPlan } from "./subscriptionPlan";
export const SUBSCRIPTION_PLAN_DAYS = { monthly: 30, yearly: 365 } as const;
export type AdminSubscription = {
  status: "active" | "expired" | "none" | "unknown";
  plan: "monthly" | "yearly" | "lifetime" | null;
  estimatedExpiresAt: string | null;
  source?: "complimentary";
};

// Reporting estimate only; never use this to grant or revoke access.
export function estimateAdminSubscription(
  purchase: { productId?: string; planType?: string; purchaseDate?: Date | string | null } | null | undefined,
  now = new Date(),
  complimentaryExpiresAt?: Date | string | null
): AdminSubscription {
  const purchased = estimatePurchaseSubscription(purchase, now);
  if (purchased.status === "active") return purchased;
  const expiry = complimentaryExpiresAt ? new Date(complimentaryExpiresAt).getTime() : NaN;
  if (Number.isFinite(expiry) && (expiry > now.getTime() || purchased.status === "none")) {
    return {
      status: expiry > now.getTime() ? "active" : "expired",
      plan: "yearly", estimatedExpiresAt: new Date(expiry).toISOString(),
      source: "complimentary",
    };
  }
  return purchased;
}

function estimatePurchaseSubscription(
  purchase: { productId?: string; planType?: string; purchaseDate?: Date | string | null } | null | undefined,
  now: Date
): AdminSubscription {
  if (!purchase) return { status: "none", plan: null, estimatedExpiresAt: null };
  const plan = subscriptionPlan(purchase.productId, purchase.planType);
  const purchasedAt = purchase.purchaseDate ? new Date(purchase.purchaseDate).getTime() : NaN;
  if (!Number.isFinite(purchasedAt) || purchasedAt > now.getTime() ||
      (plan !== "monthly" && plan !== "yearly" && plan !== "lifetime")) {
    return { status: "unknown", plan: null, estimatedExpiresAt: null };
  }
  if (plan === "lifetime") return { status: "active", plan, estimatedExpiresAt: null };
  const expiresAt = purchasedAt + SUBSCRIPTION_PLAN_DAYS[plan] * 86400000;
  return {
    status: expiresAt >= now.getTime() ? "active" : "expired",
    plan,
    estimatedExpiresAt: new Date(expiresAt).toISOString(),
  };
}
