const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const jwt = require('jsonwebtoken');
const { NextRequest, NextResponse } = require('next/server');

function load(file, modules, extra = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const sandbox = { exports: {}, URL, AbortSignal, process: { env: {
    APPLE_ISSUER_ID: 'issuer', APPLE_KEY_ID: 'key', APPLE_BUNDLE_ID: 'example.app',
    APPLE_PRIVATE_KEY_PATH: 'private.p8', JWT_SECRET: 'test-secret',
  }, cwd: () => '/backend' }, require: name => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, ...extra };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.exports;
}
function signed(payload) { return jwt.sign(payload, 'fixture'); }
function notification(overrides = {}) {
  return { signedPayload: signed({ data: { signedTransactionInfo: signed({
    transactionId: '123', originalTransactionId: '100', bundleId: 'example.app',
    environment: 'Production', offerType: 2, offerIdentifier: 'VIP', productId: 'annual',
    purchaseDate: 100, expiresDate: 200, signedDate: 300, ...overrides,
  }) } }) };
}
function service(fetch) {
  return load('src/lib/appStoreOffers.ts', {
    'node:fs/promises': { readFile: async () => 'private-key' },
    'node:path': path, jsonwebtoken: { sign: () => 'test-bearer', decode: jwt.decode },
  }, { fetch });
}
test('empty Apple history remains empty, with correct environment and date window', async () => {
  let request;
  const { getAppStoreOffers } = service(async (url, options) => {
    request = { url, options };
    return Response.json({ notificationHistory: [], hasMore: false });
  });
  const result = await getAppStoreOffers('sandbox');
  assert.equal(result.transactions.length, 0);
  assert.equal(result.notificationCount, 0);
  assert.equal(request.url.hostname, 'api.storekit-sandbox.apple.com');
  const dates = JSON.parse(request.options.body);
  assert.equal(dates.endDate - dates.startDate, 30 * 86400000 - 60000);
  assert.equal(request.options.cache, 'no-store');
});
test('pagination deduplicates transactions, keeps latest revocation, and excludes ordinary purchases', async () => {
  let calls = 0;
  const { getAppStoreOffers } = service(async url => {
    calls++;
    if (calls === 1) return Response.json({ notificationHistory: [notification(), notification({ transactionId: 'ordinary', offerType: undefined })], hasMore: true, paginationToken: 'next page' });
    assert.equal(url.searchParams.get('paginationToken'), 'next page');
    return Response.json({ notificationHistory: [notification({ signedDate: 400, revocationDate: 350 }), notification({ signedDate: 200 }), notification({ transactionId: '456', offerType: 3, offerIdentifier: 'AMBASSADOR', expiresDate: undefined })], hasMore: false });
  });
  const result = await getAppStoreOffers('production');
  assert.equal(calls, 2);
  assert.equal(result.notificationCount, 5);
  assert.equal(result.transactions.length, 2);
  assert.equal(result.transactions.find(t => t.id === '123').revokedAt, 350);
  assert.equal(result.transactions.find(t => t.id === '456').kind, 'Offer code');
  assert.equal(result.transactions.find(t => t.id === '456').expiresAt, null);
});
test('Apple failures, wrong app, malformed payloads, and broken pagination fail without false empty success', async () => {
  const cases = [
    [() => new Response('secret error detail', { status: 401 }), /HTTP 401/],
    [() => Response.json({ notificationHistory: [notification({ bundleId: 'other' })], hasMore: false }), /different app/],
    [() => Response.json({ notificationHistory: [{ signedPayload: 'invalid' }], hasMore: false }), /invalid signed payload/],
    [() => Response.json({ notificationHistory: [], hasMore: true }), /pagination/],
    [() => Response.json({ notificationHistory: [], hasMore: true, paginationToken: 'repeat' }), /pagination/],
  ];
  for (const [response, expected] of cases) {
    await assert.rejects(service(async () => response()).getAppStoreOffers('production'), expected);
  }
});
test('admin route rejects unauthenticated, non-admin, and invalid environment requests before calling Apple', async () => {
  let calls = 0;
  const { GET } = load('src/app/api/admin/offers/route.ts', {
    'next/server': { NextResponse }, jsonwebtoken: jwt,
    '@/lib/appStoreOffers': { AppStoreError: Error, getAppStoreOffers: async environment => { calls++; return { environment, transactions: [] }; } },
  });
  const request = (role, query = '') => new NextRequest(`https://example.test/api/admin/offers${query}`, {
    headers: role ? { cookie: `admin_session=${jwt.sign({ role }, 'test-secret')}` } : {},
  });
  assert.equal((await GET(request())).status, 401);
  assert.equal((await GET(request('user'))).status, 401);
  assert.equal((await GET(request('admin', '?environment=other'))).status, 400);
  assert.equal(calls, 0);
  const response = await GET(request('admin', '?environment=sandbox'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).environment, 'sandbox');
  assert.equal(calls, 1);
});
