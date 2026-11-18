const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
const mongoose = require('mongoose');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', code)(name => name in mocks ? mocks[name] : require(name), exports);
  return exports;
}
const presence = load('src/lib/appPresence.ts');
const userId = 'a'.repeat(24);
function setup(identity = { userId, role: 'user' }, matchedCount = 1) {
  const writes = [];
  const route = load('src/app/api/users/presence/route.ts', {
    'next/server': { NextResponse }, mongoose,
    '@/lib/db': { connectDB: async () => {} },
    '@/lib/appPresence': presence,
    '@/lib/presenceUpdate': load('src/lib/presenceUpdate.ts', { './appPresence': presence }),
    '@/lib/presenceEvents': { publishPresenceChange: async () => {} },
    '@/lib/getUserFromRequest': { getUserFromRequest: async () => identity },
    '@/lib/apiResponse': { apiErrorResponse: () => NextResponse.json({}, { status: 500 }) },
    '@/models/User': { User: { updateOne: async (...args) => { writes.push(args); return { matchedCount }; } } },
  });
  return { ...route, writes };
}
const request = () => new NextRequest('http://localhost/api/users/presence', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },

});
test('presence rejects missing, non-user and malformed identities without writes', async () => {
  for (const identity of [null, { role: 'admin', userId }, { role: 'user', userId: 'bad' }]) {
    const api = setup(identity);
    assert.equal((await api.POST(request())).status, 401);
    assert.equal(api.writes.length, 0);
  }
});
test('heartbeat uses authenticated identity and server time; cannot overwrite profile timestamp', async () => {
  const api = setup();
  const before = Date.now();
  const response = await api.POST(request());
  const [filter, update, options] = api.writes[0];
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(filter, { _id: userId, isBlocked: { $ne: true }, deletionPending: { $ne: true } });
  assert.ok(update.$max.lastSeenAt.getTime() >= before && update.$max.lastSeenAt.getTime() <= Date.now());
  assert.deepEqual(options, { timestamps: false });
  assert.equal((await response.json()).lastSeenAt, update.$max.lastSeenAt.toISOString());
});
test('blocked, deleting or missing accounts cannot register activity', async () => {
  assert.equal((await setup(undefined, 0).POST(request())).status, 403);
});
test('multiple devices only advance last seen; no offline event can overwrite it', async () => {
  const api = setup();
  await api.POST(request());
  await api.POST(request());
  for (const [, update] of api.writes) assert.deepEqual(Object.keys(update), ['$max']);
});
test('status transitions at 2 minutes and 30 days; missing history never means offline', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  const ago = ms => new Date(now - ms).toISOString();
  for (const missing of [null, undefined, '', 'invalid']) assert.deepEqual(presence.appPresence(missing, now), { active: false, label: 'No activity recorded' });
  assert.equal(presence.appPresence(ago(119999), now).active, true);
  assert.deepEqual(presence.appPresence(ago(120000), now), { active: false, label: '2 mins ago' });
  assert.equal(presence.appPresence(ago(5 * 60000), now).label, '5 mins ago');
  assert.equal(presence.appPresence(ago(3600000), now).label, '1 hour ago');
  assert.equal(presence.appPresence(ago(86400000), now).label, '1 day ago');
  assert.equal(presence.appPresence(ago(presence.INACTIVE_WINDOW_MS), now).label, 'Offline · 1 month ago');
  assert.equal(presence.appPresence(ago(1000), now, true).active, false);
});
function directory() {
  const seen = {};
  const records = [{ _id: userId, lastSeenAt: new Date('2026-11-18T12:00:00Z') }];
  const chain = {
    select: fields => { seen.fields = fields; return chain; },
    sort: value => { seen.sort = value; return chain; },
    skip: () => chain, limit: () => chain, lean: async () => records,
  };
  const route = load('src/app/api/admin/users/route.ts', {
    '@/lib/appPresence': presence,
    '@/lib/db': { connectDB: async () => {} },
    '@/models/User': { User: {
      countDocuments: async query => { seen.countQuery = query; return 1; },
      find: query => { seen.query = query; return chain; },
      aggregate: async pipeline => { seen.pipeline = pipeline; return [{ users: records, count: [{ total: 1 }] }]; },
    } },
    '@/models/UserPurchase': { UserPurchase: { collection: { name: 'purchases' }, aggregate: async () => [] } },
    '@/lib/adminUserSummary': { adminUserSubscriptionPipeline: () => [] },
    '@/lib/adminSubscriptionStatus': { estimateAdminSubscription: () => ({ status: 'none' }) },
  });
  return { ...route, seen };
}
test('directory filters presence before pagination and returns server time with lastSeenAt', async () => {
  for (const activity of ['active', 'inactive', 'untracked']) {
    const api = directory();
    const response = await api.GET(new NextRequest(`http://localhost/api/admin/users?activity=${activity}&sort=lastSeen`));
    const data = await response.json();
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.ok(data.users[0].lastSeenAt);
    assert.ok(Number.isFinite(Date.parse(data.serverNow)));
    assert.equal(api.seen.query, api.seen.countQuery);
    assert.deepEqual(api.seen.sort, { lastSeenAt: -1, _id: -1 });
    assert.ok(api.seen.fields.includes('lastSeenAt'));
    if (activity === 'active') {
      assert.equal(+api.seen.query.$and[0].$or[1].lastSeenAt.$gt, Date.parse(data.serverNow) - presence.ACTIVE_WINDOW_MS);
      assert.deepEqual(api.seen.query.isBlocked, { $ne: true });
    } else if (activity === 'inactive') {
      assert.equal(api.seen.query.lastSeenAt.$type, 'date');
      assert.equal(+api.seen.query.lastSeenAt.$lte, Date.parse(data.serverNow) - presence.INACTIVE_WINDOW_MS);
    } else assert.equal(api.seen.query.lastSeenAt, null);
  }
});
test('subscription filter retains presence fields, filter and sort', async () => {
  const api = directory();
  const response = await api.GET(new NextRequest('http://localhost/api/admin/users?accountType=active&activity=active&sort=lastSeen'));
  assert.equal(response.status, 200);
  assert.ok(api.seen.pipeline[0].$match.$and[0].$or[1].lastSeenAt.$gt);
  const rows = api.seen.pipeline.find(stage => stage.$facet).$facet.users;
  assert.deepEqual(rows[0].$sort, { lastSeenAt: -1, _id: -1 });
  assert.equal(rows.find(stage => stage.$project).$project.lastSeenAt, 1);
});
test('directory rejects unsupported activity filters and sorts', async () => {
  for (const query of ['activity=bad', 'sort=bad']) {
    const api = directory();
    assert.equal((await api.GET(new NextRequest(`http://localhost/api/admin/users?${query}`))).status, 400);
    assert.equal(api.seen.query, undefined);
  }
});

test('explicit session expiry overrides the legacy two-minute last-seen inference', () => {
  const now = Date.parse('2026-11-19T12:00:00Z');
  const recent = new Date(now - 1000).toISOString();
  assert.deepEqual(presence.appPresence(recent, now, false, new Date(0).toISOString()), { active: false, label: 'Just now' });
  assert.equal(presence.appPresence(recent, now, false, new Date(now + 1000).toISOString()).active, true);
  assert.equal(presence.appPresence(recent, now, true, new Date(now + 1000).toISOString()).active, false);
});
