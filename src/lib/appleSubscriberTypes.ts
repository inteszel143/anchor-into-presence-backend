import type { StoreEnvironment } from "./appStoreOffers";

export type AppleSubscription = {
  originalTransactionId: string;
  productId: string;
  status: "Active" | "Expired" | "Billing retry" | "Grace period" | "Revoked";
  expiresAt: number | null;
  autoRenewEnabled: boolean | null;
  offer: string;
  offerType: number | null;
  offerIdentifier: string | null;
  signedAt: number;
};
export type AppleSubscriber = {
  id: string;
  name: string | null;
  email: string | null;
  subscriptions: AppleSubscription[];
  unavailablePurchases: number;
  conflict: boolean;
  reviewReasons?: AppleReviewReason[];
};
export type AppleReviewReason = "missing_id" | "not_found" | "temporarily_unavailable" | "invalid_response" | "no_subscription";

export const appleReviewLabels: Record<AppleReviewReason, { label: string; action: string }> = {
  missing_id: { label: "Missing purchase information", action: "Ask the customer to restore purchases in the updated iOS app, then refresh." },
  not_found: { label: "Purchase not found in the selected environment", action: "Check the saved purchase details. Check Sandbox separately if this was a test purchase; this result alone does not confirm that." },
  temporarily_unavailable: { label: "Apple check could not be completed", action: "Refresh to retry. If this persists, ask technical support to check the connection." },
  invalid_response: { label: "Apple response could not be validated", action: "Ask technical support to inspect the verification response." },
  no_subscription: { label: "No subscription returned for this purchase", action: "Check the purchase type and saved details. This does not establish an inactive subscription." },
};
export type AppleSubscriberReport = {
  environment: StoreEnvironment;
  checkedAt: number;
  checkedPurchases: number;
  untrackedPurchases: number;
  subscribers: AppleSubscriber[];
  totals: { subscribers: number; active: number; inactive: number; needsReview: number };
};
