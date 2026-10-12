export type GooglePlayEnvironment = "production" | "test";

export type GooglePlayOffer = {
  id: string;
  orderId: string | null;
  productId: string;
  basePlanId: string | null;
  offerId: string | null;
  promotionCode: string | null;
  kind: "Subscription offer" | "One-time promo code" | "Custom promo code";
  startedAt: number | null;
  expiresAt: number | null;
  state: string;
};

export type GooglePlayOfferReport = {
  environment: GooglePlayEnvironment;
  checkedAt: number;
  checkedPurchases: number;
  unavailablePurchases: number;
  untrackedPurchases: number;
  offers: GooglePlayOffer[];
};
