import { createHash } from 'node:crypto';
import type { Payment } from './payment';
import type { AdvertisingDestination, VerifiedPurchaseEvent } from './contracts';

/** Call only after store verification. This does not verify client purchase data. */
export function verifiedPurchaseEvent(payment: Payment): VerifiedPurchaseEvent {
  if (!payment.key || !payment.productId || !['ios', 'android'].includes(payment.platform) ||
      !['monthly', 'yearly'].includes(payment.plan) || !Number.isFinite(payment.value) || payment.value < 0 ||
      !/^[A-Z]{3}$/.test(payment.currency) || !Number.isFinite(payment.purchasedAt) || payment.purchasedAt <= 0 ||
      typeof payment.production !== 'boolean' || typeof payment.renewal !== 'boolean') {
    throw new Error('Invalid verified purchase event');
  }
  const environment = payment.production ? 'production' : 'sandbox';
  const type = payment.renewal ? 'subscription_renewed' : 'subscription_purchased';
  // Transaction identity is stable even if later metadata corrects its classification.
  const id = createHash('sha256').update(JSON.stringify([
    'verified-purchase-v1', environment, payment.platform, payment.key,
  ])).digest('hex');
  return Object.freeze({
    schemaVersion: 1, id, type, occurredAt: payment.purchasedAt, environment, store: payment.platform,
    payment: Object.freeze({ reference: payment.key, productId: payment.productId,
      plan: payment.plan as 'monthly' | 'yearly', value: payment.value, currency: payment.currency }),
  });
}

/** Future outbox key. Not a replacement for current ledger or delivery keys. */
export function eventDeliveryKey(eventId: string, destination: AdvertisingDestination, accountId: string) {
  if (!eventId || !accountId || !['meta', 'tiktok', 'google_ads'].includes(destination)) {
    throw new Error('Invalid event delivery identity');
  }
  return createHash('sha256').update(JSON.stringify([eventId, destination, accountId])).digest('hex');
}
