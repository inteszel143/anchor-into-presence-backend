const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}, env = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, process: { env }, Date, Buffer, URLSearchParams, AbortSignal, ...globals,
    require: n => mocks[n] ?? (n.startsWith('.') ? load(path.join(path.dirname(file), n + '.ts')) : require(n)),
  });
  return exports;
}
const p = load('lib/advertising/payment.ts');
const apple = () => ({ bundleId: 'app', transactionId: '123', originalTransactionId: '100',
  productId: 'com.mindfully.premium.monthly', environment: 'Production',
  type: 'Auto-Renewable Subscription', price: 1990, currency: 'USD', purchaseDate: Date.now() - 10000,
  transactionReason: 'PURCHASE' });
const google = () => ({ orderId: 'GPA.1234-5678-9012-12345..0', purchaseToken: 'token', state: 'PROCESSED',
  lineItems: [{ productId: 'com.mindfull.premium.year', subscriptionDetails: { basePlanId: 'annual' } }],
  total: { units: '9', nanos: 990000000, currencyCode: 'USD' }, createTime: new Date(Date.now() - 10000).toISOString() });
test('Apple discount uses milliunits and the verified catalog plan', () => {
  const value = p.applePayment(apple(), 'app');
  assert.equal(value.value, 1.99); assert.equal(value.plan, 'monthly');
  assert.equal(p.metaEvent(value)._valueToSum, 1.99);
});
test('Google uses actual order total and identifies renewal', () => {
  const value = p.googlePayment(google(), 'token', true);
  assert.equal(value.value, 9.99); assert.equal(value.renewal, true); assert.equal(value.plan, 'yearly');
});
test('restores and repeated delivery have a stable transaction key', () => {
  assert.equal(p.applePayment(apple(), 'app').key, p.applePayment(apple(), 'app').key);
  assert.notEqual(p.paymentKey('ios', '123'), p.paymentKey('android', '123'));
});
test('free trials and sandbox cannot produce paid Meta events', () => {
  for (const patch of [{ price: 0 }, { environment: 'Sandbox' }]) {
    assert.throws(() => p.metaEvent(p.applePayment({ ...apple(), ...patch }, 'app')));
  }
});
test('invalid, refunded, shared and foreign Apple transactions fail closed', () => {
  for (const patch of [{ bundleId: 'other' }, { price: undefined }, { price: -1 }, { currency: '$' },
    { revocationDate: Date.now() }, { inAppOwnershipType: 'FAMILY_SHARED' }, { productId: 'unknown' },
    { purchaseDate: Date.now() + 600000 }, { environment: 'Xcode' }]) {
    assert.throws(() => p.applePayment({ ...apple(), ...patch }, 'app'));
  }
});
test('Google rejects wrong ownership token, nonpayments and unknown products', () => {
  for (const patch of [{ purchaseToken: 'other' }, { state: 'PENDING' }, { state: 'REFUNDED' },
    { total: {} }, { lineItems: [] }]) {
    assert.throws(() => p.googlePayment({ ...google(), ...patch }, 'token', true));
  }
});
test('Meta payload contains plan, value, currency and payment kind without purchase tokens', () => {
  const event = p.metaEvent(p.googlePayment(google(), 'token', true));
  assert.equal(event.fb_currency, 'USD'); assert.equal(event.payment_kind, 'renewal');
  assert.equal(event.subscription_plan, 'yearly'); assert.equal(event._eventName, 'fb_mobile_purchase');
  assert.ok(!JSON.stringify(event).includes('token'));
});
test('worker disabled by default performs no database or network work', async () => {
  const unexpected = new Proxy({}, { get() { throw new Error('Unexpected work'); } });
  const pipeline = load('lib/advertising/pipeline.ts', {
    '@/models/Advertising': { AdJob: unexpected, AdPayment: unexpected, AdConsent: unexpected },
    '@/models/UserPurchase': { UserPurchase: unexpected }, '@/models/User': { User: unexpected },
    '../appStoreOffers': {}, '../googlePlayOffers': {}, './payment': p,
  });
  assert.equal((await pipeline.runAdvertisingWorker()).disabled, true);
});

function delivery({ allowed = true, network = 'success', deliveryEnabled = true } = {}) {
  const row = { ...p.applePayment(apple(), 'app'), _id: 'payment', userId: 'user', anonId: 'XZ-anonymous', state: 'pending' };
  row.toObject = () => row;
  const updates = [];
  const calls = [];
  const select = value => ({ select: async () => value });
  const pipeline = load('lib/advertising/pipeline.ts', {
    '@/models/Advertising': {
      AdJob: { init: async () => {}, updateMany: async () => {}, findOneAndUpdate: () => select(null) },
      AdPayment: { init: async () => {},
        findOneAndUpdate: () => { const found = row.state === 'pending' ? row : null; if (found) row.state = 'sending'; return select(found); },
        updateOne: async (_, update) => { updates.push(update); Object.assign(row, update.$set); },
      },
      AdConsent: { findOne: () => select(allowed ? { anonId: 'XZ-anonymous' } : null) },
    },
    '@/models/UserPurchase': { UserPurchase: { find: () => ({ select: () => ({ limit: async () => [] }) }) } },
    '@/models/User': { User: { exists: async () => true } },
    '../appStoreOffers': {}, '../googlePlayOffers': {}, './payment': p,
  }, { AD_MEASUREMENT_ENABLED: 'true', META_DELIVERY_ENABLED: String(deliveryEnabled),
    META_APP_ID: '123', META_APP_ACCESS_TOKEN: 'secret', META_GRAPH_VERSION: 'v24.0' }, {
    fetch: async (...args) => {
      calls.push(args);
      if (network === 'timeout') throw new Error('timeout');
      return { ok: network === 'success', status: network === 'success' ? 200 : 400,
        json: async () => ({ success: network === 'success' }) };
    },
  });
  return { pipeline, row, calls, updates };
}
test('successful delivery is claimed once and never resent by the next worker', async () => {
  const d = delivery();
  await d.pipeline.runAdvertisingWorker(); await d.pipeline.runAdvertisingWorker();
  assert.equal(d.calls.length, 1); assert.equal(d.row.state, 'sent');
  const body = d.calls[0][1].body;
  assert.equal(body.get('anon_id'), 'XZ-anonymous');
  assert.equal(JSON.parse(body.get('custom_events'))[0]._valueToSum, 1.99);
});
test('withdrawn consent prevents server-side delivery', async () => {
  const d = delivery({ allowed: false }); await d.pipeline.runAdvertisingWorker();
  assert.equal(d.calls.length, 0); assert.equal(d.row.state, 'excluded');
});
test('timeout is quarantined and is not automatically replayed', async () => {
  const d = delivery({ network: 'timeout' });
  await d.pipeline.runAdvertisingWorker(); await d.pipeline.runAdvertisingWorker();
  assert.equal(d.calls.length, 1); assert.equal(d.row.state, 'uncertain');
});
test('explicit Meta rejection is visible for review', async () => {
  const d = delivery({ network: 'rejected' }); await d.pipeline.runAdvertisingWorker();
  assert.equal(d.row.state, 'review');
});
test('delivery flag leaves verified payments queued without contacting Meta', async () => {
  const d = delivery({ deliveryEnabled: false }); await d.pipeline.runAdvertisingWorker();
  assert.equal(d.calls.length, 0); assert.equal(d.row.state, 'pending');
});
