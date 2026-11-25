import jwt from "jsonwebtoken";
import { createAppStoreClient, AppStoreError } from "./appStoreOffers";
import { anchorOfferCode } from "./appleOfferCodes";

// Reporting only. Never use a client-supplied code, yearly plan, or zero price as evidence.
export async function checkApplePurchaseOffer(purchaseId: string, productId: string) {
  if (!/^\d+$/.test(purchaseId)) throw new AppStoreError("Invalid Apple transaction ID.");
  const signal = AbortSignal.timeout(8000);
  for (const environment of ["production", "sandbox"] as const) {
    const request = await createAppStoreClient(environment);
    const response = await request(`/inApps/v1/transactions/${purchaseId}`, { signal });
    if (response.status === 404 && environment === "production") continue;
    if (!response.ok) throw new AppStoreError("Apple offer check unavailable.");
    const body = await response.json();
    // This payload comes only from Apple's authenticated HTTPS API, not the app.
    const tx = typeof body.signedTransactionInfo === "string" ? jwt.decode(body.signedTransactionInfo) : null;
    if (!tx || typeof tx === "string" || tx.transactionId !== purchaseId || tx.productId !== productId ||
        tx.bundleId !== process.env.APPLE_BUNDLE_ID || tx.environment?.toLowerCase() !== environment ||
        typeof tx.originalTransactionId !== "string" || tx.revocationDate) {
      throw new AppStoreError("Apple offer response does not match the purchase.");
    }
    return {
      offerType: typeof tx.offerType === "number" ? tx.offerType : null,
      offerIdentifier: typeof tx.offerIdentifier === "string" ? tx.offerIdentifier : null,
      code: anchorOfferCode(tx.offerType, tx.offerIdentifier),
      environment, originalTransactionId: tx.originalTransactionId, checkedAt: new Date(),
    };
  }
  throw new AppStoreError("Apple purchase not found.");
}
