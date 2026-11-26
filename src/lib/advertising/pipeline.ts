import jwt from 'jsonwebtoken';
import { AdConsent, AdJob, AdPayment } from '@/models/Advertising';
import { UserPurchase } from '@/models/UserPurchase';
import { User } from '@/models/User';
import { createAppStoreClient } from '../appStoreOffers';
import { accessToken } from '../googlePlayOffers';
import { applePayment, googlePayment, paymentKey, type Payment } from './payment';
import { verifiedPurchaseEvent } from './events';
import { createMetaAdapter } from './adapters/meta';

export async function enqueuePayment(input: { platform: string; transactionId?: string; purchaseToken?: string; userId?: unknown; productId?: string; notificationId?: string }) {
  const reference = input.notificationId ?? input.transactionId ?? input.purchaseToken;
  if (!reference || !['ios', 'android'].includes(input.platform)) return;
  await AdJob.init();
  const key = paymentKey(input.platform, reference);
  try {
    await AdJob.updateOne({ key }, { $setOnInsert: { ...input, key, state: 'pending', nextAt: new Date() } }, { upsert: true });
  } catch (e) { if ((e as { code?: number }).code !== 11000) throw e; }
}

async function verify(job: any): Promise<Payment> {
  const signal = AbortSignal.timeout(15000);
  const sandbox = process.env.AD_STORE_ENVIRONMENT === 'sandbox';
  if (job.platform === 'ios') {
    if (!/^\d+$/.test(job.transactionId ?? '')) throw new Error('Invalid Apple transaction');
    const request = await createAppStoreClient(sandbox ? 'sandbox' : 'production');
    const response = await request(`/inApps/v1/transactions/${job.transactionId}`, { signal });
    if (!response.ok) throw new Error('Apple verification unavailable');
    const body = await response.json();
    const t = typeof body.signedTransactionInfo === 'string' ? jwt.decode(body.signedTransactionInfo) : null;
    if (!t || typeof t === 'string' || t.transactionId !== job.transactionId ||
        t.environment !== (sandbox ? 'Sandbox' : 'Production')) throw new Error('Apple transaction mismatch');
    return applePayment(t, process.env.APPLE_BUNDLE_ID!);
  }
  if (!job.purchaseToken) throw new Error('Missing Play purchase token');
  const bearer = await accessToken(signal);
  const request = async (endpoint: string) => {
    const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(process.env.GOOGLE_PLAY_PACKAGE_NAME!)}/${endpoint}`, {
      headers: { Authorization: `Bearer ${bearer}` }, signal, redirect: 'error', cache: 'no-store',
    });
    if (!response.ok) throw new Error('Google verification unavailable');
    return response.json();
  };
  const sub = await request(`purchases/subscriptionsv2/tokens/${encodeURIComponent(job.purchaseToken)}`);
  if (sub.kind !== 'androidpublisher#subscriptionPurchaseV2' || Boolean(sub.testPurchase) !== sandbox) throw new Error('Unexpected subscription environment');
  const id = job.transactionId ?? sub.lineItems?.[0]?.latestSuccessfulOrderId;
  if (typeof id !== 'string' || !/^GPA\.[\d.-]+$/.test(id)) throw new Error('Missing successful order');
  const order = await request(`orders/${encodeURIComponent(id)}`);
  if (order.orderId !== id) throw new Error('Order mismatch');
  // RTDN identifies a subscription, not an individual order. Recover intervening
  // orders if several renewals happened before this notification was processed.
  if (!job.transactionId) {
    const match = /^(GPA\.[\d-]+)\.\.(\d+)$/.exec(id);
    if (match) {
      const latest = Number(match[2]);
      const previous = await AdPayment.find({ platform: 'android', originalId: paymentKey('android-token', job.purchaseToken) }).select('transactionId').lean();
      const indices = previous.map(r => Number(/\.\.(\d+)$/.exec(r.transactionId ?? '')?.[1] ?? -1));
      const start = Math.max(-1, ...indices) + 1;
      if (latest - start > 120) throw new Error('Order history needs a controlled backfill');
      for (let n = start; n < latest; n++) {
        await enqueuePayment({ platform: 'android', transactionId: `${match[1]}..${n}`, purchaseToken: job.purchaseToken });
      }
    }
  }
  return googlePayment(order, job.purchaseToken, !sandbox);
}

async function owner(job: any, p: Payment): Promise<{ userId: string; anonId?: string } | null> {
  const records = await UserPurchase.find(job.platform === 'android'
    ? { platform: 'android', purchaseToken: job.purchaseToken }
    : { purchaseId: { $in: [p.transactionId, p.originalId] }, platform: { $in: ['ios', null] } })
    .select('userId productId purchaseId +advertisingAnonId').lean();
  const previous = await AdPayment.find({ platform: p.platform, originalId: p.originalId }).select('userId +anonId').lean();
  const ids = new Set([...records, ...previous].filter(r => r.userId).map(r => String(r.userId)));
  if (ids.size !== 1) return null;
  const id = [...ids][0];
  if ((job.userId && String(job.userId) !== id) || (job.productId && job.productId.split(':')[0] !== p.productId)) return null;
  if (!await User.exists({ _id: id, isBlocked: { $ne: true } })) return null;
  const record = records.find(r => r.purchaseId === p.transactionId) ?? records[0];
  return { userId: id, anonId: record?.advertisingAnonId ?? previous.find(r => r.anonId)?.anonId };
}

export async function runAdvertisingWorker(limit = 10) {
  if (process.env.AD_MEASUREMENT_ENABLED !== 'true') return { disabled: true };
  await Promise.all([AdJob.init(), AdPayment.init()]);
  // The purchase route persists this flag in the same write as the purchase.
  // A queue outage therefore cannot lose a payment or interrupt fulfillment.
  const purchases = await UserPurchase.find({ advertisingPending: true }).select('+purchaseToken').limit(limit);
  for (const p of purchases) {
    await enqueuePayment({ platform: p.platform, transactionId: p.purchaseId, purchaseToken: p.purchaseToken,
      userId: p.userId, productId: p.productId });
    await UserPurchase.updateOne({ _id: p._id }, { $set: { advertisingPending: false } });
  }
  // Verification is read-only at the stores and safe to retry after a crash.
  await AdJob.updateMany({ state: 'working', leaseUntil: { $lt: new Date() } }, { $set: { state: 'pending' } });
  let verified = 0;
  for (let i = 0; i < limit; i++) {
    const job = await AdJob.findOneAndUpdate({ state: 'pending', nextAt: { $lte: new Date() } },
      { $set: { state: 'working', leaseUntil: new Date(Date.now() + 120000) }, $inc: { attempts: 1 } },
      { new: true, sort: { nextAt: 1 } }).select('+purchaseToken');
    if (!job) break;
    try {
      const p = await verify(job);
      const identity = await owner(job, p);
      if (!identity) throw new Error('Owner not yet available or conflicting');
      await AdPayment.updateOne({ key: p.key }, { $setOnInsert: { ...p, ...identity,
        state: p.production && p.value > 0 ? 'pending' : 'excluded' } }, { upsert: true });
      await AdJob.updateOne({ _id: job._id }, { $set: { state: 'done', userId: identity.userId }, $unset: { error: 1 } });
      verified++;
    } catch {
      await AdJob.updateOne({ _id: job._id }, { $set: {
        state: job.attempts >= 20 ? 'review' : 'pending', error: 'Verification or ownership requires retry/review',
        nextAt: new Date(Date.now() + Math.min(86400000, 60000 * 2 ** Math.min(job.attempts, 10))),
      } });
    }
  }
  if (process.env.META_DELIVERY_ENABLED !== 'true') return { verified, deliveryDisabled: true };
  const { META_APP_ID: appId, META_APP_ACCESS_TOKEN: token, META_GRAPH_VERSION: version } = process.env;
  if (!appId || !/^\d+$/.test(appId) || !token || !/^v\d+\.0$/.test(version ?? '')) throw new Error('Meta delivery configuration missing');
  const adapter = createMetaAdapter({ appId, accessToken: token, graphVersion: version! });
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    // A single sender owns a payment. Never automatically replay an ambiguous
    // network response: /activities has no assumed exactly-once guarantee.
    const row = await AdPayment.findOneAndUpdate({ state: 'pending' }, { $set: { state: 'sending' } }, { new: true, sort: { createdAt: 1 } }).select('+anonId');
    if (!row) break;
    const consent = await AdConsent.findOne({ userId: row.userId, allowed: true, platform: row.platform,
      expiresAt: { $gt: new Date() } }).select('+anonId');
    const user = await User.exists({ _id: row.userId, isBlocked: { $ne: true } });
    if (!row.anonId || consent?.anonId !== row.anonId || !user || row.purchasedAt < Date.now() - 7 * 86400000) {
      await AdPayment.updateOne({ _id: row._id }, { $set: { state: 'excluded', error: 'No current consent/identity, inactive account, or stale event' } });
      continue;
    }
    try {
      const result = await adapter.deliver(verifiedPurchaseEvent(row.toObject() as Payment), {
        advertisingAllowed: true, destinationAnonymousId: row.anonId,
      });
      if (result.state === 'sent') {
        await AdPayment.updateOne({ _id: row._id }, { $set: { state: 'sent' }, $unset: { error: 1 } });
        sent++;
      } else {
        await AdPayment.updateOne({ _id: row._id }, { $set: result });
      }
    } catch {
      await AdPayment.updateOne({ _id: row._id }, { $set: { state: 'uncertain', error: 'Delivery outcome unknown; reconcile before replay' } });
    }
  }
  return { verified, sent };
}
