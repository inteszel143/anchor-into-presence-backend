export const SUBSCRIPTION_PLAN_DAYS = { monthly: 30, yearly: 365 } as const;
export type AdminSubscription = {
  status: "active" | "expired" | "none" | "unknown";
  plan: "monthly" | "yearly" | "lifetime" | null;
  estimatedExpiresAt: string | null;
};

// Reporting estimate only; never use this to grant or revoke access.
export function estimateAdminSubscription(
  purchase: { planType?: string; purchaseDate?: Date | string | null } | null | undefined,
  now = new Date()
): AdminSubscription {
  if (!purchase) return { status: "none", plan: null, estimatedExpiresAt: null };
  const plan = purchase.planType;
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
