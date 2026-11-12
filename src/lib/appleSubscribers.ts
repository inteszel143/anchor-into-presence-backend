import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { UserPurchase } from "@/models/UserPurchase";
import { User } from "@/models/User";
import { AppStoreError, createAppStoreClient, type StoreEnvironment } from "./appStoreOffers";
import type { AppleSubscriber, AppleSubscriberReport, AppleSubscription } from "./appleSubscriberTypes";

// Decode only responses fetched directly from Apple's authenticated HTTPS API.
// Reporting only: this does not grant access or verify app-account ownership.
function decode(value: unknown) {
  const payload = typeof value === "string" ? jwt.decode(value) : null;
  if (!payload || typeof payload === "string") throw new AppStoreError("Apple returned an invalid subscription payload.");
  return payload;
}

export function mapAppleSubscriptions(body: unknown, environment: StoreEnvironment): AppleSubscription[] {
  const response = body as { bundleId?: string; environment?: string; data?: { lastTransactions?: { status: number; originalTransactionId: string; signedTransactionInfo: string; signedRenewalInfo?: string }[] }[] };
  if (!response || response.bundleId !== process.env.APPLE_BUNDLE_ID || response.environment?.toLowerCase() !== environment || !Array.isArray(response.data)) {
    throw new AppStoreError("Apple returned subscription data for an unexpected app or environment.");
  }
  const statuses = { 1: "Active", 2: "Expired", 3: "Billing retry", 4: "Grace period", 5: "Revoked" } as const;
  return response.data.flatMap(group => {
    if (!Array.isArray(group.lastTransactions)) throw new AppStoreError("Apple returned incomplete subscription data.");
    return group.lastTransactions.map(item => {
      const transaction = decode(item.signedTransactionInfo);
      const status = statuses[item.status as keyof typeof statuses];
      if (!status || transaction.bundleId !== process.env.APPLE_BUNDLE_ID || transaction.environment?.toLowerCase() !== environment ||
          typeof transaction.originalTransactionId !== "string" || transaction.originalTransactionId !== item.originalTransactionId ||
          typeof transaction.productId !== "string" || typeof transaction.signedDate !== "number") {
        throw new AppStoreError("Apple returned inconsistent subscription data.");
      }
      const renewal = item.signedRenewalInfo ? decode(item.signedRenewalInfo) : null;
      const matching = renewal?.originalTransactionId === transaction.originalTransactionId && renewal?.environment?.toLowerCase() === environment;
      return {
        originalTransactionId: transaction.originalTransactionId,
        productId: transaction.productId, status,
        expiresAt: typeof transaction.expiresDate === "number" ? transaction.expiresDate : null,
        autoRenewEnabled: matching && [0, 1].includes(renewal?.autoRenewStatus) ? renewal?.autoRenewStatus === 1 : null,
        offer: transaction.offerType === 1 ? "Introductory offer / trial" : transaction.offerType === 2 ? "Promotional offer" : transaction.offerType === 3 ? "Offer code" : transaction.offerType === 4 ? "Win-back offer" : "Regular subscription",
        signedAt: transaction.signedDate,
      };
    });
  });
}

export function subscriberTotals(rows: AppleSubscriber[]): AppleSubscriberReport["totals"] {
  const confirmed = rows.filter(row => !row.conflict && row.subscriptions.length > 0);
  const active = confirmed.filter(row => row.subscriptions.some(sub => sub.status === "Active" || sub.status === "Grace period")).length;
  return {
    subscribers: confirmed.length, active,
    inactive: confirmed.filter(row => !row.unavailablePurchases && !row.subscriptions.some(sub => sub.status === "Active" || sub.status === "Grace period")).length,
    needsReview: rows.filter(row => row.conflict || row.unavailablePurchases > 0).length,
  };
}

export async function getAppleSubscribers(environment: StoreEnvironment): Promise<AppleSubscriberReport> {
  await connectDB();
  // Legacy numeric purchase IDs may be Apple IDs; Apple must confirm them.
  const purchases = await UserPurchase.find({ $or: [{ platform: "ios" }, { platform: { $exists: false }, purchaseId: /^\d+$/ }] })
    .select("purchaseId userId").limit(2001).lean();
  if (purchases.length > 2000) throw new AppStoreError("This report needs a background sync to check more than 2,000 purchase records.");
  const users = purchases.length ? await User.find({ _id: { $in: purchases.map(p => p.userId) } }).select("name email").lean() : [];
  const byUser = new Map(users.map(user => [String(user._id), user]));
  const accounts = new Map<string, AppleSubscriber>();
  const owners = new Map<string, Set<string>>();
  let untrackedPurchases = 0;
  for (const purchase of purchases) {
    const id = String(purchase.userId);
    const user = byUser.get(id);
    if (!accounts.has(id)) accounts.set(id, { id, name: user?.name ?? null, email: user?.email ?? null, subscriptions: [], unavailablePurchases: 0, conflict: false });
    if (typeof purchase.purchaseId !== "string" || !/^\d+$/.test(purchase.purchaseId)) {
      untrackedPurchases++;
      accounts.get(id)!.unavailablePurchases++;
      continue;
    }
    const ids = owners.get(purchase.purchaseId) ?? new Set<string>();
    ids.add(id);
    owners.set(purchase.purchaseId, ids);
  }
  const request = owners.size ? await createAppStoreClient(environment) : null;
  const signal = AbortSignal.timeout(45000);
  const entries = [...owners.entries()];
  let cursor = 0;
  let checkedPurchases = 0;
  let configurationFailure = false;
  const chainOwners = new Map<string, Set<string>>();
  await Promise.all(Array.from({ length: Math.min(4, entries.length) }, async () => {
    while (cursor < entries.length) {
      const [transactionId, ids] = entries[cursor++];
      try {
        if (signal.aborted || configurationFailure) throw new Error("Check unavailable");
        const response = await request!(`/inApps/v1/subscriptions/${transactionId}`, { signal });
        if (response.status === 401 || response.status === 403) configurationFailure = true;
        if (!response.ok) throw new Error("Check unavailable");
        const subscriptions = mapAppleSubscriptions(await response.json(), environment);
        checkedPurchases++;
        for (const subscription of subscriptions) {
          const associated = chainOwners.get(subscription.originalTransactionId) ?? new Set<string>();
          for (const id of ids) {
            associated.add(id);
            const row = accounts.get(id)!;
            const index = row.subscriptions.findIndex(s => s.originalTransactionId === subscription.originalTransactionId);
            if (index < 0) row.subscriptions.push(subscription);
            else if (row.subscriptions[index].signedAt < subscription.signedAt) row.subscriptions[index] = subscription;
          }
          chainOwners.set(subscription.originalTransactionId, associated);
        }
      } catch {
        for (const id of ids) accounts.get(id)!.unavailablePurchases++;
      }
    }
  }));
  if (configurationFailure) throw new AppStoreError("Apple rejected the server credentials. Check the App Store signing key and permissions.");
  for (const ids of chainOwners.values()) if (ids.size > 1) for (const id of ids) accounts.get(id)!.conflict = true;
  const subscribers = [...accounts.values()].filter(row => row.subscriptions.length || row.unavailablePurchases)
    .sort((a, b) => (a.name || a.email || a.id).localeCompare(b.name || b.email || b.id));
  return { environment, checkedAt: Date.now(), checkedPurchases, untrackedPurchases, subscribers, totals: subscriberTotals(subscribers) };
}
