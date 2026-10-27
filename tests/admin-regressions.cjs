const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { NextRequest } = require('next/server');

// Load route modules with database/storage adapters stubbed: never touch real data.
function loadModule(file, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) throw new Error(`Unexpected application dependency: ${name}`);
    return require(name);
  }, module, module.exports);
  return module.exports;
}

const modelMocks = Activity => ({
  '@/lib/activityUploadLimits': loadModule('src/lib/activityUploadLimits.ts'),
  '@/lib/db': { connectDB: async () => {} },
  '@/models/Activity': { Activity },
  '@/models/Category': { Category: { findById: async () => ({ name: 'Daily Anchor' }) } },
  '@/lib/activityMedia': loadModule('src/lib/activityMedia.ts'),
  '@/models/Tags': { Tags: { find: async () => [], insertMany: async () => [] } },
  '@/lib/s3': { uploadToS3: () => { throw new Error('Unexpected upload'); } },
});

test('admin authentication rejects missing, invalid, expired, and non-admin cookies', async () => {
  const { SignJWT } = await import('jose');
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-secret-not-a-real-credential';
  try {
    const { middleware } = loadModule('src/middleware.ts', { '@/lib/db': { connectDB: async () => {} }, '@/models/User': { User: {} } });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = (role, expiry = '1h') => new SignJWT({ role, adminId: 'test' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(expiry).sign(secret);
    for (const cookie of ['', 'invalid', await token('user'), await token('admin', '-1h')]) {
      const response = await middleware(new NextRequest('http://localhost/api/admin/users', { headers: { cookie: `admin_session=${cookie}` } }));
      assert.equal(response.status, 401);
      assert.equal((await response.json()).message, 'Unauthorized');
    }
    const authorized = await middleware(new NextRequest('http://localhost/api/admin/users', { headers: { cookie: `admin_session=${await token('admin')}` } }));
    assert.equal(authorized.headers.get('x-middleware-next'), '1');
    for (const endpoint of ['/admin', '/api/admin/login', '/api/admin/logout']) {
      const response = await middleware(new NextRequest(`http://localhost${endpoint}`));
      assert.equal(response.headers.get('x-middleware-next'), '1');
    }
    const page = await middleware(new NextRequest('http://localhost/admin/dashboard', { headers: { accept: 'text/html' } }));
    assert.equal(page.headers.get('location'), 'http://localhost/admin/login');
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous;
  }
});

test('logout expires the admin cookie without redirecting a POST to another host', async () => {
  let cookie;
  const { POST } = loadModule('src/app/api/admin/logout/route.ts', { 'next/headers': { cookies: async () => ({ set: (...args) => { cookie = args; } }) } });
  const response = await POST();
  assert.equal(response.status, 200);
  assert.equal(cookie[0], 'admin_session');
  assert.equal(cookie[1], '');
  assert.equal(cookie[2].expires.getTime(), 0);
  assert.equal(cookie[2].path, '/');
});

test('activity detail includes edit fields and joins the actual category and tags', async () => {
  let pipeline;
  const { GET } = loadModule('src/app/api/admin/activities/[id]/route.ts', modelMocks({ aggregate: async value => { pipeline = value; return [{ name: 'Test activity' }]; } }));
  const response = await GET(new NextRequest('http://localhost/api/admin/activities/507f1f77bcf86cd799439011'), { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) });
  assert.equal(response.status, 200);
  assert.equal(pipeline.find(stage => stage.$lookup?.from === 'categories').$lookup.localField, 'category');
  assert.equal(pipeline.find(stage => stage.$lookup?.from === 'tags').$lookup.localField, 'tags');
  const projection = pipeline.find(stage => stage.$project).$project;
  for (const field of ['thumbnail', 'tags', 'category', 'contentType', 'contentId', 'duration', 'scheduleDate', 'schedulePublish']) assert.equal(projection[field], 1, field);
});

test('activity edit persists the schedule date separately from its boolean flag', async () => {
  for (const date of ['2026-12-25', '']) {
    let payload;
    const { PATCH } = loadModule('src/app/api/admin/activities/[id]/route.ts', modelMocks({ findById: async () => ({ category: '507f1f77bcf86cd799439012' }), findByIdAndUpdate: async (_, update) => { payload = update; return { _id: 'test', ...update }; } }));
    const form = new FormData();
    form.set('name', 'Test'); form.set('description', 'Test description'); form.set('scheduleDate', date);
    const response = await PATCH(new NextRequest('http://localhost/api/admin/activities/507f1f77bcf86cd799439011', { method: 'PATCH', body: form }), { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) });
    assert.equal(response.status, 200);
    assert.equal(payload.scheduleDate, date);
    assert.equal(payload.schedulePublish, Boolean(date));
    assert.equal(payload.scheduleTime, undefined, 'Preserve the existing scheduled time');
  }
});

test('activity update reports a deleted record rather than success', async () => {
  const { PATCH } = loadModule('src/app/api/admin/activities/[id]/route.ts', modelMocks({ findById: async () => ({ category: '507f1f77bcf86cd799439012' }), findByIdAndUpdate: async () => null }));
  const form = new FormData(); form.set('name', 'Test'); form.set('description', 'Test');
  const response = await PATCH(new NextRequest('http://localhost/api/admin/activities/507f1f77bcf86cd799439011', { method: 'PATCH', body: form }), { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) });
  assert.equal(response.status, 404);
});

test('users end-date includes the full day and does not return password fields', async () => {
  let query, selection;
  const chain = { select: fields => { selection = fields; return chain; }, sort: () => chain, skip: () => chain, limit: () => chain, lean: async () => [] };
  const { GET } = loadModule('src/app/api/admin/users/route.ts', { '@/models/UserPurchase': { UserPurchase: {} }, '@/lib/adminUserSummary': {}, '@/lib/adminSubscriptionStatus': loadModule('src/lib/adminSubscriptionStatus.ts'), '@/lib/db': { connectDB: async () => {} }, '@/models/User': { User: { countDocuments: async filter => { query = filter; return 0; }, find: () => chain } } });
  const response = await GET(new NextRequest('http://localhost/api/admin/users?endDate=2026-10-04'));
  assert.equal(response.status, 200);
  assert.equal(query.createdAt.$lte.toISOString(), '2026-10-04T23:59:59.999Z');
  assert.equal(selection, 'name email isBlocked isTestAccount createdAt');
});

test('test account labels are explicit, reversible, and cannot change account access', async () => {
  const updates = [];
  const { PATCH } = loadModule('src/app/api/admin/users/[id]/test-account/route.ts', {
    '@/lib/db': { connectDB: async () => {} },
    '@/models/User': { User: { findByIdAndUpdate: (id, update) => {
      updates.push(update);
      return { select: async () => ({ isTestAccount: update.$set.isTestAccount }) };
    } } },
  });
  const context = { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) };
  const request = body => new NextRequest('http://localhost/api/admin/users/507f1f77bcf86cd799439011/test-account', { method: 'PATCH', body: JSON.stringify(body) });
  for (const value of [true, false]) {
    const response = await PATCH(request({ isTestAccount: value, isBlocked: true }), context);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { isTestAccount: value });
    assert.deepEqual(updates.at(-1), { $set: { isTestAccount: value } });
  }
  for (const body of [{}, { isTestAccount: 'true' }, null]) {
    assert.equal((await PATCH(request(body), context)).status, 400);
  }
  assert.equal((await PATCH(request({ isTestAccount: true }), { params: Promise.resolve({ id: 'invalid' }) })).status, 400);
  assert.equal(updates.length, 2);
});

test('test account label update reports a missing user', async () => {
  const { PATCH } = loadModule('src/app/api/admin/users/[id]/test-account/route.ts', {
    '@/lib/db': { connectDB: async () => {} },
    '@/models/User': { User: { findByIdAndUpdate: () => ({ select: async () => null }) } },
  });
  const response = await PATCH(new NextRequest('http://localhost/api/admin/users/507f1f77bcf86cd799439011/test-account', { method: 'PATCH', body: JSON.stringify({ isTestAccount: true }) }), { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) });
  assert.equal(response.status, 404);
});

test('account overview returns totals, including zero for an empty database', async () => {
  for (const result of [[], [{ totalAccounts: 12, testAccounts: 3, estimatedActiveSubscriptions: 4 }]]) {
    const { GET } = loadModule('src/app/api/admin/users/summary/route.ts', {
      '@/lib/db': { connectDB: async () => {} },
      '@/models/User': { User: { aggregate: async () => result } },
      '@/models/UserPurchase': { UserPurchase: { collection: { name: 'user_purchases' } } },
      '@/lib/adminUserSummary': loadModule('src/lib/adminUserSummary.ts', { './adminSubscriptionStatus': loadModule('src/lib/adminSubscriptionStatus.ts') }),
    });
    const response = await GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await response.json(), result[0] ?? { totalAccounts: 0, testAccounts: 0, estimatedActiveSubscriptions: 0 });
  }
});

test('account overview does not report false zero totals when the database fails', async () => {
  const { GET } = loadModule('src/app/api/admin/users/summary/route.ts', {
    '@/lib/db': { connectDB: async () => { throw new Error('private database details'); } },
    '@/models/User': { User: {} },
    '@/models/UserPurchase': { UserPurchase: {} },
    '@/lib/adminUserSummary': loadModule('src/lib/adminUserSummary.ts', { './adminSubscriptionStatus': loadModule('src/lib/adminSubscriptionStatus.ts') }),
  });
  const response = await GET();
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.totalAccounts, undefined);
  assert.ok(!body.message.includes('private database details'));
});

test('cached user schemas retain test account updates after hot reload', () => {
  const mongoose = require('mongoose');
  const isolated = new mongoose.Mongoose();
  for (const name of ['User', 'user', 'users']) {
    isolated.model(name, new isolated.Schema({ name: String }));
  }
  loadModule('src/models/User.ts', { mongoose: isolated });
  for (const name of ['User', 'user', 'users']) {
    const model = isolated.models[name];
    for (const value of [true, false]) {
      const query = model.findByIdAndUpdate('507f1f77bcf86cd799439011', { $set: { isTestAccount: value } });
      assert.deepEqual(query._castUpdate(query.getUpdate()), { $set: { isTestAccount: value } });
      const reloaded = model.hydrate({ _id: '507f1f77bcf86cd799439011', isTestAccount: value });
      assert.equal(reloaded.toJSON().isTestAccount, value);
    }
  }
});

test('test label endpoint rejects a silently discarded update', async () => {
  const { PATCH } = loadModule('src/app/api/admin/users/[id]/test-account/route.ts', {
    '@/lib/db': { connectDB: async () => {} },
    '@/models/User': { User: { findByIdAndUpdate: () => ({ select: async () => ({ isTestAccount: false }) }) } },
  });
  const response = await PATCH(new NextRequest('http://localhost/api/admin/users/507f1f77bcf86cd799439011/test-account', { method: 'PATCH', body: JSON.stringify({ isTestAccount: true }) }), { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) });
  assert.equal(response.status, 500);
});

test('subscription reporting handles missing records, expiry boundaries, lifetime, and invalid records', () => {
  const { estimateAdminSubscription: estimate } = loadModule('src/lib/adminSubscriptionStatus.ts');
  const now = new Date('2026-10-23T12:00:00Z');
  const day = 86400000;
  const purchase = (planType, age) => ({ planType, purchaseDate: new Date(now.getTime() - age * day) });
  assert.equal(estimate(null, now).status, 'none');
  assert.equal(estimate(purchase('monthly', 29), now).status, 'active');
  assert.equal(estimate(purchase('monthly', 30), now).status, 'active');
  assert.equal(estimate(purchase('monthly', 31), now).status, 'expired');
  assert.equal(estimate(purchase('yearly', 364), now).status, 'active');
  assert.equal(estimate(purchase('yearly', 366), now).status, 'expired');
  assert.deepEqual(estimate(purchase('lifetime', 1000), now), { status: 'active', plan: 'lifetime', estimatedExpiresAt: null });
  for (const item of [purchase('monthly', -1), purchase('invalid', 1), { planType: 'monthly' }, { planType: 'monthly', purchaseDate: 'invalid' }]) {
    assert.equal(estimate(item, now).status, 'unknown');
  }
  assert.equal(estimate(purchase('monthly', 1), now).estimatedExpiresAt, '2026-11-21T12:00:00.000Z');
});

test('user directory attaches subscription estimates by account without conflating blocked or test flags', async () => {
  const records = [{ _id: 'one', name: 'Registered user', isBlocked: false }, { _id: 'two', name: 'Test user', isTestAccount: true, isBlocked: true }];
  const chain = { select: () => chain, sort: () => chain, skip: () => chain, limit: () => chain, lean: async () => records };
  let pipeline;
  const { GET } = loadModule('src/app/api/admin/users/route.ts', {
    '@/lib/db': { connectDB: async () => {} },
    '@/models/User': { User: { countDocuments: async () => 2, find: () => chain } },
    '@/models/UserPurchase': { UserPurchase: { aggregate: async stages => { pipeline = stages; return [{ _id: 'two', planType: 'monthly', purchaseDate: new Date() }]; } } },
    '@/lib/adminUserSummary': {}, '@/lib/adminSubscriptionStatus': loadModule('src/lib/adminSubscriptionStatus.ts'),
  });
  const response = await GET(new NextRequest('http://localhost/api/admin/users'));
  const data = await response.json();
  assert.equal(data.users[0].subscription.status, 'none');
  assert.equal(data.users[1].subscription.status, 'active');
  assert.equal(data.users[1].isTestAccount, true);
  assert.equal(data.users[1].isBlocked, true);
  assert.deepEqual(pipeline[0].$match.userId.$in, ['one', 'two']);
  assert.equal(data.total, 2);
});

test('active user filter applies before pagination and uses the overview subscription estimate', async () => {
  const status = loadModule('src/lib/adminSubscriptionStatus.ts');
  const summary = loadModule('src/lib/adminUserSummary.ts', { './adminSubscriptionStatus': status });
  let pipeline;
  const { GET } = loadModule('src/app/api/admin/users/route.ts', {
    '@/lib/db': { connectDB: async () => {} },
    '@/models/User': { User: { aggregate: async stages => {
      pipeline = stages;
      return [{ users: [{ _id: 'subscriber', name: 'Member', purchase: { planType: 'lifetime', purchaseDate: new Date('2025-01-01') } }], count: [{ total: 21 }] }];
    } } },
    '@/models/UserPurchase': { UserPurchase: { collection: { name: 'purchases' } } },
    '@/lib/adminSubscriptionStatus': status,
    '@/lib/adminUserSummary': summary,
  });
  const response = await GET(new NextRequest('http://localhost/api/admin/users?accountType=active&page=2&limit=10&search=Member&endDate=2026-10-24'));
  const data = await response.json();
  assert.deepEqual(pipeline[0].$match.isTestAccount, { $ne: true });
  assert.equal(pipeline[0].$match.$or[0].name.$regex, 'Member');
  assert.equal(pipeline[0].$match.createdAt.$lte.toISOString(), '2026-10-24T23:59:59.999Z');
  const now = pipeline[3].$set.estimatedActive.$and[1].$lte[1];
  assert.deepEqual(pipeline.slice(1, 4), summary.adminUserSubscriptionPipeline('purchases', now));
  assert.deepEqual(pipeline[4], { $match: { estimatedActive: true } });
  assert.deepEqual(pipeline[5].$facet.users.slice(1, 3), [{ $skip: 10 }, { $limit: 10 }]);
  assert.deepEqual(pipeline[5].$facet.count, [{ $count: 'total' }]);
  assert.equal(data.total, 21);
  assert.equal(data.totalPages, 3);
  assert.equal(data.page, 2);
  assert.equal(data.users[0]._id, 'subscriber');
  assert.equal(data.users[0].subscription.status, 'active');
  assert.equal(data.users[0].purchase, undefined);
});

test('test and registered filters constrain counts and rows consistently; invalid types are rejected', async () => {
  for (const accountType of ['test', 'registered', 'invalid']) {
    let countQuery, rowsQuery;
    const chain = { select: () => chain, sort: () => chain, skip: () => chain, limit: () => chain, lean: async () => [] };
    const { GET } = loadModule('src/app/api/admin/users/route.ts', {
      '@/lib/db': { connectDB: async () => {} },
      '@/models/User': { User: { countDocuments: async query => { countQuery = query; return 0; }, find: query => { rowsQuery = query; return chain; } } },
      '@/models/UserPurchase': { UserPurchase: {} },
      '@/lib/adminSubscriptionStatus': loadModule('src/lib/adminSubscriptionStatus.ts'),
      '@/lib/adminUserSummary': {},
    });
    const response = await GET(new NextRequest(`http://localhost/api/admin/users?accountType=${accountType}`));
    if (accountType === 'invalid') {
      assert.equal(response.status, 400);
      assert.equal(rowsQuery, undefined);
    } else {
      assert.equal(response.status, 200);
      assert.deepEqual(countQuery, accountType === 'test' ? { isTestAccount: true } : {});
      assert.deepEqual(rowsQuery, countQuery);
      assert.equal((await response.json()).total, 0);
    }
  }
});
