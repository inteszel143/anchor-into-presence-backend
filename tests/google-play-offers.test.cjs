const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ts = require('typescript');
const jwt = require('jsonwebtoken');
const { Mongoose } = require('mongoose');
const { NextRequest, NextResponse } = require('next/server');

function load(file, modules, extra = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const context = { exports: {}, URLSearchParams, AbortSignal, process: { env: {
    GOOGLE_PLAY_SERVICE_ACCOUNT_PATH: 'private.json', GOOGLE_PLAY_PACKAGE_NAME: 'example.app', JWT_SECRET: 'test-secret',
  }, cwd: () => '/backend' }, require: name => {
    assert.ok(name in modules, `Unexpected import ${name}`);
    return modules[name];
  }, ...extra };
  vm.runInNewContext(source, context);
  return context.exports;
}
function purchase(overrides = {}) {
  return { kind: 'androidpublisher#subscriptionPurchaseV2', subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
    startTime: '2026-01-01T00:00:00Z', lineItems: [{ productId: 'annual', latestSuccessfulOrderId: 'GPA.123',
      expiryTime: '2027-01-01T00:00:00Z', offerDetails: { basePlanId: 'yearly', offerId: 'partner' } }], ...overrides };
}
function service({ fetchPurchase, tokens = ['private-token'], untracked = 0, auth = () => Response.json({ access_token: 'private-bearer' }), missingConfig = false } = {}) {
  const requests = [];
  let pipeline;
  const api = load('src/lib/googlePlayOffers.ts', {
    './offerCustomers': { findOfferCustomers: async () => new Map() },
    'node:crypto': crypto, 'node:path': path,
    'node:fs/promises': { readFile: async () => JSON.stringify({ type: 'service_account', client_email: 'service@example.test', private_key: 'private-key' }) },
    jsonwebtoken: { sign: () => 'private-assertion' },
    '@/lib/db': { connectDB: async () => {} },
    '@/models/UserPurchase': { UserPurchase: {
      aggregate: value => { pipeline = value; return { option: async () => tokens.map(_id => ({ _id })) }; },
      countDocuments: () => ({ maxTimeMS: async () => untracked }),
    } },
  }, {
    ...(missingConfig ? { process: { env: {}, cwd: () => '/backend' } } : {}),
    fetch: async (url, options) => {
      requests.push({ url: String(url), options });
      return String(url).includes('oauth2.googleapis.com') ? auth() : fetchPurchase ? fetchPurchase(url, options) : Response.json(purchase());
    },
  });
  return { ...api, requests, pipeline: () => pipeline };
}

test('only actual offer/code items appear; no deferred, pending, or ordinary purchases', () => {
  const { mapGooglePlayOffers } = service();
  assert.equal(mapGooglePlayOffers(purchase(), 'private-token', 'production').length, 1);
  assert.equal(mapGooglePlayOffers(purchase({ subscriptionState: 'SUBSCRIPTION_STATE_PENDING' }), 't', 'production').length, 0);
  const ordinary = { productId: 'monthly', latestSuccessfulOrderId: 'GPA.456', offerDetails: { basePlanId: 'monthly' } };
  const deferred = { productId: 'next-plan', offerDetails: { offerId: 'unowned' } };
  assert.equal(mapGooglePlayOffers(purchase({ lineItems: [ordinary, deferred] }), 't', 'production').length, 0);
});
test('promo-code types are mapped without inventing one-time code text', () => {
  const { mapGooglePlayOffers } = service();
  const item = purchase().lineItems[0];
  const rows = mapGooglePlayOffers(purchase({ lineItems: [
    { ...item, signupPromotion: { oneTimeCode: {} } },
    { ...item, signupPromotion: { vanityCode: { promotionCode: 'WELCOME' } } },
  ] }), 'private-token', 'production');
  assert.equal(rows[0].kind, 'One-time promo code');
  assert.equal(rows[0].promotionCode, null);
  assert.equal(rows[1].kind, 'Custom promo code');
  assert.equal(rows[1].promotionCode, 'WELCOME');
  assert.notEqual(rows[0].id, rows[1].id);
  assert.ok(!JSON.stringify(rows).includes('private-token'));
});
test('test and production are separated using Google’s testPurchase field', () => {
  const { mapGooglePlayOffers } = service();
  const fixture = purchase({ testPurchase: {} });
  assert.equal(mapGooglePlayOffers(fixture, 't', 'production').length, 0);
  assert.equal(mapGooglePlayOffers(fixture, 't', 'test').length, 1);
  assert.equal(mapGooglePlayOffers(purchase(), 't', 'test').length, 0);
});
test('report queries unique Android tokens and retains Google’s cancellation and period semantics', async () => {
  const api = service({ untracked: 2, fetchPurchase: () => Response.json(purchase({ subscriptionState: 'SUBSCRIPTION_STATE_CANCELED' })) });
  const report = await api.getGooglePlayOffers('production');
  assert.equal(report.checkedPurchases, 1);
  assert.equal(report.untrackedPurchases, 2);
  assert.equal(report.offers[0].state, 'SUBSCRIPTION_STATE_CANCELED');
  assert.equal(report.offers[0].expiresAt, Date.parse('2027-01-01T00:00:00Z'));
  assert.equal(api.pipeline()[0].$match.platform, 'android');
  assert.equal(api.pipeline()[1].$group._id, '$purchaseToken');
  assert.equal(api.requests[1].options.cache, 'no-store');
  assert.match(api.requests[1].url, /applications\/example.app\/purchases\/subscriptionsv2\/tokens\/private-token$/);
  assert.ok(!JSON.stringify(report).includes('private-token'));
});
test('no saved tokens gives an explicitly empty report; missing config fails', async () => {
  const report = await service({ tokens: [], untracked: 3 }).getGooglePlayOffers('production');
  assert.equal(report.checkedPurchases, 0);
  assert.equal(report.offers.length, 0);
  assert.equal(report.untrackedPurchases, 3);
  await assert.rejects(service({ missingConfig: true }).getGooglePlayOffers('production'), /not configured/);
});
test('expired/unavailable tokens are counted; permission and API failures never become empty success', async () => {
  const expired = service({ fetchPurchase: () => Response.json({}, { status: 410 }) });
  assert.equal((await expired.getGooglePlayOffers('production')).unavailablePurchases, 1);
  const failures = [
    [403, { error: { details: [{ reason: 'SERVICE_DISABLED' }] } }, /Enable the Google Play/],
    [403, { error: { message: 'private-token' } }, /denied access/],
    [429, { error: { message: 'private-token' } }, /HTTP 429/],
    [500, {}, /HTTP 500/],
    [200, {}, /unexpected subscription/],
  ];
  for (const [status, body, expected] of failures) {
    await assert.rejects(service({ fetchPurchase: () => Response.json(body, { status }) }).getGooglePlayOffers('production'), error => {
      assert.match(error.message, expected);
      assert.ok(!error.message.includes('private-token'));
      return true;
    });
  }
  await assert.rejects(service({ tokens: Array(501).fill('t') }).getGooglePlayOffers('production'), /background sync/);
});
test('Google route requires an admin and validates environment before calling the service', async () => {
  let calls = 0;
  const { GET } = load('src/app/api/admin/offers/google/route.ts', {
    'next/server': { NextResponse }, jsonwebtoken: jwt,
    '@/lib/googlePlayOffers': { GooglePlayError: Error, getGooglePlayOffers: async environment => { calls++; return { environment, offers: [] }; } },
  });
  const request = (role, query = '') => new NextRequest(`https://example.test/api/admin/offers/google${query}`, {
    headers: role ? { cookie: `admin_session=${jwt.sign({ role }, 'test-secret')}` } : {},
  });
  assert.equal((await GET(request())).status, 401);
  assert.equal((await GET(request('user'))).status, 401);
  assert.equal((await GET(request('admin', '?environment=sandbox'))).status, 400);
  assert.equal(calls, 0);
  const response = await GET(request('admin', '?environment=test'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).environment, 'test');
});
test('saved purchase tokens are excluded from normal model queries', () => {
  const mongoose = new Mongoose();
  const { UserPurchase } = load('src/models/UserPurchase.ts', { mongoose });
  assert.equal(UserPurchase.schema.path('purchaseToken').options.select, false);
});
test('purchase endpoint accepts free Android offers and legacy clients, rejects malformed tokens', async () => {
  const writes = [];
  const { POST } = load('src/app/api/users/purchase/route.ts', {
    'next/server': { NextResponse },
    '@/lib/db': { connectDB: async () => {} },
    '@/lib/getAuthUser': { getAuthUser: async () => ({ userId: 'u' }) },
    '@/lib/apiResponse': { apiErrorResponse: () => Response.json({}, { status: 500 }) },
    '@/models/UserPurchase': { UserPurchase: { create: async value => writes.push(value) } },
  });
  const body = { productId: 'annual', purchaseId: 'GPA.123', amount: 0, purchaseDate: '2026-01-01T00:00:00Z', planType: 'yearly', currencySymbol: 'USD' };
  const post = value => POST({ json: async () => value });
  const response = await post({ ...body, platform: 'android', purchaseToken: 'secret-token' });
  assert.equal(response.status, 201);
  assert.equal(writes[0].purchaseToken, 'secret-token');
  assert.ok(!JSON.stringify(await response.json()).includes('secret-token'));
  assert.equal((await post(body)).status, 201);
  for (const extra of [{ platform: 'ios', purchaseToken: 't' }, { purchaseToken: 't' }, { platform: 'android', purchaseToken: {} }, { platform: 'android', purchaseToken: ' ' }, { amount: -1 }, { amount: '0' }]) {
    assert.equal((await post({ ...body, ...extra })).status, 400);
  }
  assert.equal(writes.length, 2);
});

test('renewal settings and regular price are separate from current discount phase', () => {
  const { mapGooglePlayOffers } = service();
  const item = purchase().lineItems[0];
  const row = extra => mapGooglePlayOffers(purchase({ lineItems: [{ ...item, ...extra }] }), 't', 'production')[0];
  assert.equal(row({}).autoRenewEnabled, null);
  assert.equal(row({ prepaidPlan: {} }).autoRenewEnabled, false);
  const discounted = row({ autoRenewingPlan: { autoRenewEnabled: true, recurringPrice: { currencyCode: 'USD', units: '59', nanos: 990000000 } }, offerPhase: { introductoryPrice: {} } });
  assert.equal(discounted.autoRenewEnabled, true);
  assert.equal(discounted.regularPrice, 'USD 59.99');
  assert.equal(discounted.pricingPhase, 'Discounted');
  assert.equal(row({ autoRenewingPlan: { autoRenewEnabled: false }, offerPhase: { basePrice: {} } }).pricingPhase, 'Regular price');
});
