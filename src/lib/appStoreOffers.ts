import { readFile } from "node:fs/promises";
import path from "node:path";
import jwt from "jsonwebtoken";

export type StoreEnvironment = "production" | "sandbox";
export type OfferTransaction = {
  id: string;
  platform: "Apple" | "Google";
  originalTransactionId: string;
  code: string;
  kind: "Promotional offer" | "Offer code";
  productId: string;
  purchasedAt: number;
  expiresAt: number | null;
  revokedAt: number | null;
};
export type OfferHistory = {
  environment: StoreEnvironment;
  checkedAt: number;
  startDate: number;
  endDate: number;
  notificationCount: number;
  transactions: OfferTransaction[];
};

export class AppStoreError extends Error {}

// Only decode payloads received directly from Apple's authenticated HTTPS API.
// This read-only report is NOT a receipt verifier or an entitlement decision.
function decode(value: unknown): jwt.JwtPayload {
  if (typeof value !== "string") throw new AppStoreError("Apple returned an invalid signed payload.");
  const payload = jwt.decode(value);
  if (!payload || typeof payload === "string") throw new AppStoreError("Apple returned an invalid signed payload.");
  return payload;
}

export async function getAppStoreOffers(environment: StoreEnvironment): Promise<OfferHistory> {
  const { APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_BUNDLE_ID, APPLE_PRIVATE_KEY_PATH } = process.env;
  if (!APPLE_ISSUER_ID || !APPLE_KEY_ID || !APPLE_BUNDLE_ID || !APPLE_PRIVATE_KEY_PATH) {
    throw new AppStoreError("App Store credentials are not configured on this server.");
  }
  let token: string;
  try {
    const key = await readFile(path.resolve(process.cwd(), APPLE_PRIVATE_KEY_PATH), "utf8");
    token = jwt.sign({ bid: APPLE_BUNDLE_ID }, key, {
      algorithm: "ES256", keyid: APPLE_KEY_ID, issuer: APPLE_ISSUER_ID,
      audience: "appstoreconnect-v1", expiresIn: "5m",
    });
  } catch {
    throw new AppStoreError("The App Store signing key is unavailable or invalid on this server.");
  }
  const host = environment === "production" ? "https://api.storekit.apple.com" : "https://api.storekit-sandbox.apple.com";
  const endDate = Date.now();
  const startDate = endDate - (environment === "production" ? 180 : 30) * 86400000 + 60000;
  const transactions = new Map<string, { signedDate: number; row: OfferTransaction }>();
  const seenTokens = new Set<string>();
  let paginationToken: string | undefined;
  let notificationCount = 0;
  const signal = AbortSignal.timeout(45000);
  for (let page = 0; ; page++) {
    // Fail explicitly rather than presenting partial totals as complete.
    if (page >= 100) throw new AppStoreError("Too much notification history to load at once. A background sync is needed.");
    const url = new URL("/inApps/v1/notifications/history", host);
    if (paginationToken) url.searchParams.set("paginationToken", paginationToken);
    const response = await fetch(url, {
      method: "POST", redirect: "error", cache: "no-store", signal,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    });
    if (!response.ok) throw new AppStoreError(`Apple could not load offer history (HTTP ${response.status}).`);
    const body = await response.json();
    if (!Array.isArray(body.notificationHistory) || typeof body.hasMore !== "boolean") {
      throw new AppStoreError("Apple returned an unexpected notification history response.");
    }
    notificationCount += body.notificationHistory.length;
    for (const item of body.notificationHistory) {
      const notification = decode(item.signedPayload);
      if (!notification.data?.signedTransactionInfo) continue;
      const transaction = decode(notification.data.signedTransactionInfo);
      if (transaction.bundleId !== APPLE_BUNDLE_ID || transaction.environment?.toLowerCase() !== environment) {
        throw new AppStoreError("Apple returned a transaction for a different app or environment.");
      }
      if (transaction.offerType !== 2 && transaction.offerType !== 3) continue;
      if (typeof transaction.transactionId !== "string" || typeof transaction.purchaseDate !== "number") {
        throw new AppStoreError("Apple returned an incomplete offer transaction.");
      }
      const signedDate = typeof transaction.signedDate === "number" ? transaction.signedDate : 0;
      const previous = transactions.get(transaction.transactionId);
      if (previous && previous.signedDate > signedDate) continue;
      transactions.set(transaction.transactionId, { signedDate, row: {
        id: transaction.transactionId,
        platform: "Apple",
        originalTransactionId: transaction.originalTransactionId ?? transaction.transactionId,
        code: transaction.offerIdentifier || "Identifier unavailable",
        kind: transaction.offerType === 2 ? "Promotional offer" : "Offer code",
        productId: transaction.productId ?? "Product unavailable",
        purchasedAt: transaction.purchaseDate,
        expiresAt: typeof transaction.expiresDate === "number" ? transaction.expiresDate : null,
        revokedAt: typeof transaction.revocationDate === "number" ? transaction.revocationDate : null,
      } });
    }
    if (!body.hasMore) break;
    if (typeof body.paginationToken !== "string" || !body.paginationToken || seenTokens.has(body.paginationToken)) {
      throw new AppStoreError("Apple returned an invalid history pagination token.");
    }
    paginationToken = body.paginationToken;
    seenTokens.add(body.paginationToken);
  }
  return { environment, checkedAt: Date.now(), startDate, endDate, notificationCount,
    transactions: [...transactions.values()].map(value => value.row).sort((a, b) => b.purchasedAt - a.purchasedAt) };
}
