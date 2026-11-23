import type { OfferCustomer } from "./offerCustomers";
export type GooglePlayEnvironment = "production" | "test";

export type GooglePlayOffer = {
  id: string;
  orderId: string | null;
  productId: string;
  basePlanId: string | null;
  offerId: string | null;
  promotionCode: string | null;
  kind: "Subscription offer" | "One-time promo code" | "Custom promo code" | "Regular subscription";
  startedAt: number | null;
  expiresAt: number | null;
  state: string;
  customer?: OfferCustomer;
  autoRenewEnabled: boolean | null;
  regularPrice: string | null;
  pricingPhase: string;
};

export type GooglePlayOfferReport = {
  environment: GooglePlayEnvironment;
  checkedAt: number;
  checkedPurchases: number;
  unavailablePurchases: number;
  untrackedPurchases: number;
  offers: GooglePlayOffer[];
  unavailableCustomers?: OfferCustomer[];
};

export type GoogleSubscriber = {
  id: string;
  name: string | null;
  email: string | null;
  subscriptions: GooglePlayOffer[];
  unavailablePurchases: number;
  active: boolean;
  needsReview: boolean;
};
export type GoogleSubscriberReport = {
  environment: GooglePlayEnvironment;
  checkedAt: number;
  checkedPurchases: number;
  untrackedPurchases: number;
  unavailablePurchases: number;
  unmatchedItems: number;
  subscribers: GoogleSubscriber[];
  recordedPurchases: GoogleRecordedPurchase[];
  totals: { subscribers: number; active: number; inactive: number; needsReview: number };
};

// App records only: neither current access nor store environment is verified.
export type GoogleRecordedPurchase = {
  id: string;
  name: string | null;
  email: string | null;
  productId: string | null;
  orderId: string | null;
  purchasedAt: number | null;
};
