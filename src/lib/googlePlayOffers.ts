import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { findOfferCustomers } from "./offerCustomers";
import { UserPurchase } from "@/models/UserPurchase";
import type { GooglePlayEnvironment, GooglePlayOffer, GooglePlayOfferReport } from "./googlePlayOfferTypes";

export class GooglePlayError extends Error {}

type PlayPurchase = {
  kind?: string;
  startTime?: string;
  subscriptionState?: string;
  testPurchase?: object;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean; recurringPrice?: { currencyCode?: string; units?: string; nanos?: number } };
    prepaidPlan?: object;
    offerPhase?: { freeTrial?: object; introductoryPrice?: object; basePrice?: object; prorationPeriod?: object };
    latestSuccessfulOrderId?: string;
    offerDetails?: { basePlanId?: string; offerId?: string };
    signupPromotion?: { oneTimeCode?: object; vanityCode?: { promotionCode?: string } };
  }>;
};

function timestamp(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new GooglePlayError("Google returned an invalid subscription date.");
  return parsed;
}

// A read-only snapshot, not a renewal ledger or an entitlement decision.
// Never return purchase tokens or Google's raw error bodies.
export function mapGooglePlayOffers(purchase: PlayPurchase, token: string, environment: GooglePlayEnvironment): GooglePlayOffer[] {
  if (purchase.kind !== "androidpublisher#subscriptionPurchaseV2" ||
      !Array.isArray(purchase.lineItems) || typeof purchase.subscriptionState !== "string") {
    throw new GooglePlayError("Google returned an unexpected subscription response.");
  }
  if ((purchase.testPurchase != null) !== (environment === "test")) return [];
  if (["SUBSCRIPTION_STATE_PENDING", "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED"].includes(purchase.subscriptionState)) return [];
  return purchase.lineItems.flatMap((item, index) => {
    const promotion = item.signupPromotion;
    const offerId = item.offerDetails?.offerId || null;
    if (!offerId && !promotion?.oneTimeCode && !promotion?.vanityCode) return [];
    // Deferred replacements aren't owned yet and must not count as redemptions.
    if (!item.latestSuccessfulOrderId) return [];
    if (typeof item.productId !== "string" || !item.productId) {
      throw new GooglePlayError("Google returned an incomplete offer purchase.");
    }
    const price = item.autoRenewingPlan?.recurringPrice;
    const amount = price ? Number(price.units ?? 0) + (price.nanos ?? 0) / 1e9 : NaN;
    return [{
      id: createHash("sha256").update(`${token}:${index}`).digest("hex"),
      orderId: item.latestSuccessfulOrderId,
      productId: item.productId,
      basePlanId: item.offerDetails?.basePlanId || null,
      offerId,
      promotionCode: promotion?.vanityCode?.promotionCode || null,
      kind: promotion?.vanityCode ? "Custom promo code" as const : promotion?.oneTimeCode ? "One-time promo code" as const : "Subscription offer" as const,
      startedAt: timestamp(purchase.startTime),
      expiresAt: timestamp(item.expiryTime),
      state: purchase.subscriptionState!,
      autoRenewEnabled: item.autoRenewingPlan ? item.autoRenewingPlan.autoRenewEnabled ?? false : item.prepaidPlan ? false : null,
      regularPrice: price?.currencyCode && /^[A-Z]{3}$/.test(price.currencyCode) && Number.isFinite(amount)
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: price.currencyCode, currencyDisplay: "code", maximumFractionDigits: 9 }).format(amount).replace(/\s/g, " ") : null,
      pricingPhase: item.offerPhase?.freeTrial ? "Free trial" : item.offerPhase?.introductoryPrice ? "Discounted" : item.offerPhase?.basePrice ? "Regular price" : item.offerPhase?.prorationPeriod ? "Prorated" : "Unavailable",
    }];
  });
}

async function accessToken(signal: AbortSignal): Promise<string> {
  const keyPath = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH;
  if (!keyPath || !process.env.GOOGLE_PLAY_PACKAGE_NAME) {
    throw new GooglePlayError("Google Play is not configured. Set GOOGLE_PLAY_SERVICE_ACCOUNT_PATH and GOOGLE_PLAY_PACKAGE_NAME on the server.");
  }
  let assertion: string;
  try {
    const key = JSON.parse(await readFile(path.resolve(process.cwd(), keyPath), "utf8"));
    if (key.type !== "service_account" || typeof key.client_email !== "string" || typeof key.private_key !== "string") throw new Error();
    assertion = jwt.sign({ scope: "https://www.googleapis.com/auth/androidpublisher" }, key.private_key, {
      algorithm: "RS256", issuer: key.client_email, audience: "https://oauth2.googleapis.com/token", expiresIn: "5m",
    });
  } catch {
    throw new GooglePlayError("The Google Play service account file is unavailable or invalid on this server.");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", cache: "no-store", redirect: "error", signal,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new GooglePlayError(`Google could not authenticate the service account (HTTP ${response.status}).`);
  const body = await response.json();
  if (typeof body.access_token !== "string" || !body.access_token) throw new GooglePlayError("Google returned an invalid access token.");
  return body.access_token;
}

export async function getGooglePlayOffers(environment: GooglePlayEnvironment): Promise<GooglePlayOfferReport> {
  const signal = AbortSignal.timeout(45000);
  const bearer = await accessToken(signal);
  await connectDB();
  // Aggregate deduplicates renewals/restores before querying Google. select:false
  // protects ordinary purchase-history queries; this internal query opts in.
  const [purchases, untrackedPurchases] = await Promise.all([
    UserPurchase.aggregate<{ _id: string }>([
      { $match: { platform: "android", purchaseToken: { $type: "string", $ne: "" } } },
      { $group: { _id: "$purchaseToken" } },
      { $limit: 501 },
    ]).option({ maxTimeMS: 10000 }),
    UserPurchase.countDocuments({
      $or: [{ platform: "android" }, { purchaseId: /^GPA\./ }],
      purchaseToken: { $in: [null, ""] },
    }).maxTimeMS(10000),
  ]);
  if (purchases.length > 500) throw new GooglePlayError("More than 500 saved Google purchases need checking. A background sync is needed to report these without partial totals.");
  const customers = await findOfferCustomers(purchases.map(p => p._id), "android");
  let checkedPurchases = 0;
  let unavailablePurchases = 0;
  const offers: GooglePlayOffer[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(5, purchases.length) }, async () => {
    while (next < purchases.length) {
      const token = purchases[next++]._id;
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(process.env.GOOGLE_PLAY_PACKAGE_NAME!)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${bearer}` }, cache: "no-store", redirect: "error", signal,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        if (response.status === 404 || response.status === 410 ||
            (response.status === 400 && error.error?.errors?.some((entry: { reason?: string }) => entry.reason === "subscriptionExpired"))) {
          unavailablePurchases++;
          continue;
        }
        if (response.status === 403) {
          const disabled = error.error?.details?.some((entry: { reason?: string }) => entry.reason === "SERVICE_DISABLED");
          throw new GooglePlayError(disabled
            ? "Enable the Google Play Android Developer API in the service account’s Google Cloud project, then refresh."
            : "Google Play denied access. Grant the service account access to this app and the required billing permissions in Play Console.");
        }
        throw new GooglePlayError(`Google could not check purchases (HTTP ${response.status}). No partial report is shown.`);
      }
      const purchase: PlayPurchase = await response.json();
      offers.push(...mapGooglePlayOffers(purchase, token, environment).map(offer => ({ ...offer, customer: customers.get(token) })));
      checkedPurchases++;
    }
  }));
  return { environment, checkedAt: Date.now(), checkedPurchases, unavailablePurchases, untrackedPurchases,
    offers: offers.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)) };
}
