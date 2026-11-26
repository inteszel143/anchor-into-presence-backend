import { createHash } from 'node:crypto';
import { subscriptionPlan } from '../subscriptionPlan';
import { verifiedPurchaseEvent } from './events';
import { metaPurchasePayload } from './adapters/meta';

export type Payment = {
  key: string; platform: 'ios' | 'android'; transactionId: string; originalId: string;
  productId: string; plan: string; value: number; currency: string; purchasedAt: number;
  renewal: boolean; production: boolean;
};
export function paymentKey(platform: string, id: string) {
  return createHash('sha256').update(`${platform}:${id}`).digest('hex');
}
function finish(p: Payment): Payment {
  if (!p.transactionId || !p.originalId || !['monthly', 'yearly'].includes(p.plan) ||
      !Number.isFinite(p.value) || p.value < 0 || !/^[A-Z]{3}$/.test(p.currency) ||
      !Number.isFinite(p.purchasedAt) || p.purchasedAt <= 0 || p.purchasedAt > Date.now() + 300000) {
    throw new Error('Incomplete verified payment');
  }
  return p;
}
// Call ONLY with verified JWS or a response from Apple's authenticated API.
export function applePayment(t: Record<string, any>, bundleId: string): Payment {
  if (t.bundleId !== bundleId || !['Production', 'Sandbox'].includes(t.environment) ||
      t.type !== 'Auto-Renewable Subscription' || t.revocationDate || t.inAppOwnershipType === 'FAMILY_SHARED' ||
      typeof t.price !== 'number' || t.multiSeatInfo) throw new Error('Not an eligible Apple payment');
  return finish({ key: paymentKey('ios', t.transactionId), platform: 'ios', transactionId: t.transactionId,
    originalId: t.originalTransactionId, productId: t.productId, plan: subscriptionPlan(t.productId) ?? '',
    value: t.price / 1000, currency: t.currency, purchasedAt: t.purchaseDate,
    renewal: t.transactionReason === 'RENEWAL', production: t.environment === 'Production' });
}
// Order total is the charged amount; subscription recurringPrice is NOT used.
export function googlePayment(o: Record<string, any>, token: string, production: boolean): Payment {
  if (o.state !== 'PROCESSED' || o.purchaseToken !== token || o.lineItems?.length !== 1 ||
      !o.lineItems[0].subscriptionDetails || !o.total) throw new Error('Not an eligible Google payment');
  const item = o.lineItems[0];
  const units = o.total.units ?? '0';
  const nanos = o.total.nanos ?? 0;
  if (!/^-?\d+$/.test(String(units)) || !Number.isInteger(nanos) || Math.abs(nanos) >= 1e9) throw new Error('Invalid money');
  return finish({ key: paymentKey('android', o.orderId), platform: 'android', transactionId: o.orderId,
    originalId: paymentKey('android-token', token), productId: item.productId,
    plan: subscriptionPlan(item.productId) ?? '', value: Number(units) + nanos / 1e9,
    currency: o.total.currencyCode, purchasedAt: Date.parse(o.createTime),
    renewal: /\.\.\d+$/.test(o.orderId), production });
}
export function metaEvent(p: Payment) {
  // Compatibility entry point for existing callers; mapping belongs to the adapter.
  return metaPurchasePayload(verifiedPurchaseEvent(p));
}
