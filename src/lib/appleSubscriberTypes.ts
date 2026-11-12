import type { StoreEnvironment } from "./appStoreOffers";

export type AppleSubscription = {
  originalTransactionId: string;
  productId: string;
  status: "Active" | "Expired" | "Billing retry" | "Grace period" | "Revoked";
  expiresAt: number | null;
  autoRenewEnabled: boolean | null;
  offer: string;
  signedAt: number;
};
export type AppleSubscriber = {
  id: string;
  name: string | null;
  email: string | null;
  subscriptions: AppleSubscription[];
  unavailablePurchases: number;
  conflict: boolean;
};
export type AppleSubscriberReport = {
  environment: StoreEnvironment;
  checkedAt: number;
  checkedPurchases: number;
  untrackedPurchases: number;
  subscribers: AppleSubscriber[];
  totals: { subscribers: number; active: number; inactive: number; needsReview: number };
};
