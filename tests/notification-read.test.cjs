const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
const ids = Array.from({ length: 12 }, (_, i) => (i + 1).toString(16).padStart(24, '0'));
function setup() {
  let identity = { userId: 'alice', role: 'user' };
  const receipts = new Map();
  let writes = 0;
  const modules = {
    'next/server': { NextResponse }, '@/lib/db': { connectDB: async () => {} },
    '@/lib/getUserFromRequest': { getUserFromRequest: async () => identity },
    '@/lib/apiResponse': { apiErrorResponse: () => NextResponse.json({}, { status: 500 }) },
    '@/models/UserNotification': { UserNotification: {
      find: () => { let offset = 0; const chain = { skip: n => { offset = n; return chain; }, limit: () => chain, sort: () => chain, lean: async () => ids.slice(offset, offset + 10).map(_id => ({ _id, title: 'Update' })) }; return chain; },
      countDocuments: async filter => ids.filter(id => !filter?._id.$nin.includes(id)).length,
      exists: async ({ _id }) => ids.includes(_id),
    } },
    '@/models/NotificationRead': { NotificationRead: {
      distinct: async (_, { userId }) => [...(receipts.get(userId) || [])],
      updateOne: async ({ userId, notificationId }) => { writes++; const read = receipts.get(userId) || new Set(); read.add(notificationId); receipts.set(userId, read); },
    } },
  };
  const source = ts.transpileModule(fs.readFileSync('src/app/api/users/notifications/route.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = { exports: {}, console, URL, require: name => { assert.ok(name in modules, name); return modules[name]; } };
  vm.runInNewContext(source, context);
  return { ...context.exports, setIdentity: value => identity = value, writes: () => writes };
}
const get = page => new NextRequest(`https://example.test/api/users/notifications?page=${page || 1}`);
const patch = id => new NextRequest('https://example.test/api/users/notifications', { method: 'PATCH', body: JSON.stringify({ notificationId: id, userId: 'bob' }) });
test('total unread covers all pages; reading is idempotent and isolated to authenticated user', async () => {
  const api = setup();
  const first = await api.GET(get());
  assert.equal(first.headers.get('cache-control'), 'private, no-store');
  const body = await first.json();
  assert.equal(body.unreadCount, 12); assert.equal(body.data.length, 10); assert.equal(body.data[0].isRead, false);
  for (let i = 0; i < 2; i++) assert.equal((await (await api.PATCH(patch(ids[0]))).json()).unreadCount, 11);
  assert.equal((await (await api.GET(get())).json()).data[0].isRead, true);
  const second = await (await api.GET(get(2))).json();
  assert.equal(second.unreadCount, 11); assert.equal(second.data.length, 2);
  api.setIdentity({ userId: 'bob', role: 'user' });
  assert.equal((await (await api.GET(get())).json()).unreadCount, 12);
});
test('authentication, invalid IDs, and nonexistent notifications reject before writing', async () => {
  const api = setup();
  for (const identity of [null, { userId: 'a', role: 'admin' }]) {
    api.setIdentity(identity);
    assert.equal((await api.GET(get())).status, 401);
    assert.equal((await api.PATCH(patch(ids[0]))).status, 401);
  }
  api.setIdentity({ userId: 'alice', role: 'user' });
  assert.equal((await api.PATCH(patch('bad'))).status, 400);
  assert.equal((await api.PATCH(patch('f'.repeat(24)))).status, 404);
  assert.equal(api.writes(), 0);
});
