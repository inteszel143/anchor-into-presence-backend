const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jwt = require('jsonwebtoken');
const { NextRequest, NextResponse } = require('next/server');
function load(file, modules, extra = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const context = { exports: {}, process: { env: { APPLE_BUNDLE_ID: 'app.test', JWT_SECRET: 'secret' } }, AbortSignal,
    require: name => { assert.ok(name in modules, `Unexpected import ${name}`); return modules[name]; }, ...extra };
  vm.runInNewContext(compiled, context);
  return context.exports;
}
const signed = value => jwt.sign(value, 'fixture');
function body({ status = 1, original = '100', offerType, signedDate = 100, env = 'Production', renew = 0 } = {}) {
  return { bundleId: 'app.test', environment: env, data: [{ lastTransactions: [{ status, originalTransactionId: original,
    signedTransactionInfo: signed({ bundleId: 'app.test', environment: env, originalTransactionId: original, productId: 'annual', signedDate, expiresDate: 200, offerType }),
    signedRenewalInfo: signed({ originalTransactionId: original, environment: env, autoRenewStatus: renew }),
  }] }] };
}
function service(purchases = [], fetch = async () => Response.json(body())) {
  return load('src/lib/appleSubscribers.ts', {
    jsonwebtoken: jwt, '@/lib/db': { connectDB: async () => {} },
    '@/models/UserPurchase': { UserPurchase: { find: () => ({ select: () => ({ limit: () => ({ lean: async () => purchases }) }) }) } },
    '@/models/User': { User: { find: () => ({ select: () => ({ lean: async () => [{ _id: 'a', name: 'Alice', email: 'alice@example.test' }] }) }) } },
    './appStoreOffers': { AppStoreError: Error, createAppStoreClient: async () => fetch },
  });
}
test('regular subscriptions, introductory offers, codes, and every Apple status are included', () => {
  const { mapAppleSubscriptions } = service();
  for (let status = 1; status <= 5; status++) {
    for (const offerType of [undefined, 1, 2, 3, 4]) {
      const [row] = mapAppleSubscriptions(body({ status, offerType }), 'production');
      assert.ok(row.status);
      assert.equal(row.autoRenewEnabled, false);
      if (!offerType) assert.equal(row.offer, 'Regular subscription');
    }
  }
});
test('rejects wrong app/environment, malformed data, and mismatched chains', () => {
  const { mapAppleSubscriptions } = service();
  for (const value of [null, {}, { ...body(), bundleId: 'other' }, body({ env: 'Sandbox' }), body({ status: 6 })]) {
    assert.throws(() => mapAppleSubscriptions(value, 'production'));
  }
  const wrong = body(); wrong.data[0].lastTransactions[0].originalTransactionId = 'other';
  assert.throws(() => mapAppleSubscriptions(wrong, 'production'));
});
test('renewals deduplicate by original ID and totals count unique accounts, including active with renew off', async () => {
  const { getAppleSubscribers } = service([{ userId: 'a', purchaseId: '101' }, { userId: 'a', purchaseId: '102' }, { userId: 'a', purchaseId: '102' }]);
  const result = await getAppleSubscribers('production');
  assert.equal(result.checkedPurchases, 2);
  assert.equal(result.subscribers.length, 1);
  assert.equal(result.subscribers[0].subscriptions.length, 1);
  assert.equal(result.totals.subscribers, 1);
  assert.equal(result.totals.active, 1);
});
test('shared subscription across accounts is excluded from subscriber counts', async () => {
  const result = await service([{ userId: 'a', purchaseId: '101' }, { userId: 'b', purchaseId: '102' }]).getAppleSubscribers('production');
  assert.equal(result.totals.subscribers, 0);
  assert.equal(result.totals.needsReview, 2);
});
test('API failures and missing IDs remain visible and never count as expired or active', async () => {
  const result = await service([{ userId: 'a', purchaseId: '101' }, { userId: 'a' }], async () => new Response('', { status: 503 })).getAppleSubscribers('production');
  assert.equal(result.subscribers[0].unavailablePurchases, 2);
  assert.equal(result.untrackedPurchases, 1);
  assert.equal(result.totals.active, 0);
  assert.equal(result.totals.inactive, 0);
  assert.equal(result.totals.needsReview, 1);
});
test('credentials rejected by Apple produce an explicit error', async () => {
  await assert.rejects(service([{ userId: 'a', purchaseId: '101' }], async () => new Response('', { status: 401 })).getAppleSubscribers('production'), /credentials/);
});
test('grace period counts active; incomplete inactive accounts are not counted as inactive', () => {
  const { subscriberTotals } = service();
  const row = (id, status, unavailablePurchases = 0) => ({ id, subscriptions: [{ status }], unavailablePurchases, conflict: false });
  const result = subscriberTotals([row('a', 'Grace period'), row('b', 'Expired'), row('c', 'Billing retry', 1), row('d', 'Revoked')]);
  assert.equal(result.subscribers, 4); assert.equal(result.active, 1); assert.equal(result.inactive, 2); assert.equal(result.needsReview, 1);
});
test('subscriber endpoint requires admin auth, validates environment, and disables caching', async () => {
  let calls = 0;
  const { GET } = load('src/app/api/admin/subscribers/route.ts', {
    'next/server': { NextResponse }, jsonwebtoken: jwt, '@/lib/appStoreOffers': { AppStoreError: Error },
    '@/lib/appleSubscribers': { getAppleSubscribers: async environment => { calls++; return { environment }; } },
  });
  const request = (role, env = 'production') => new NextRequest(`https://example.test/api/admin/subscribers?environment=${env}`, {
    headers: role ? { cookie: `admin_session=${jwt.sign({ role }, 'secret')}` } : {},
  });
  assert.equal((await GET(request())).status, 401);
  assert.equal((await GET(request('user'))).status, 401);
  assert.equal((await GET(request('admin', 'bad'))).status, 400);
  assert.equal(calls, 0);
  const response = await GET(request('admin', 'sandbox'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).environment, 'sandbox');
});
