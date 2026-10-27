const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest } = require('next/server');
function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', code)(name => name in mocks ? mocks[name] : require(name), exports);
  return exports;
}
const id = 'a'.repeat(24);
const context = { params: Promise.resolve({ id }) };
function api(role = 'admin', deleting = false) {
  const writes = [];
  const routes = load('src/app/api/admin/users/[id]/route.ts', {
    jose: { jwtVerify: async () => ({ payload: { role } }) },
    '@/lib/db': { connectDB: async () => {} },
    '@/models/User': { User: { exists: async () => deleting, findOneAndUpdate: (id, update) => ({ select: async () => { writes.push(update); return update.$set; } }) } },
    '@/lib/deleteUserAccount': { AccountDeletionError: class extends Error {}, deleteUserAccount: async (...args) => { writes.push(args); } },
  });
  const request = (body, token = 'test') => ({ cookies: { get: () => token ? { value: token } : undefined }, json: async () => body });
  return { routes, writes, request };
}
test('admin actions require an admin cookie and validate input before mutation', async () => {
  process.env.JWT_SECRET = 'test-only';
  for (const method of ['PATCH', 'DELETE']) {
    const a = api('user');
    assert.equal((await a.routes[method](a.request({ isBlocked: true, confirmation: 'x' }), context)).status, 401);
    assert.equal((await a.routes[method](a.request({}, ''), context)).status, 401);
    assert.equal(a.writes.length, 0);
    const b = api();
    assert.equal((await b.routes[method](b.request({}), context)).status, 400);
    assert.equal((await b.routes[method](b.request({}), { params: Promise.resolve({ id: 'bad' }) })).status, 400);
    assert.equal(b.writes.length, 0);
  }
});
test('blocking sets the requested state, so retries cannot accidentally unblock', async () => {
  const a = api();
  for (const isBlocked of [true, true, false]) {
    const response = await a.routes.PATCH(a.request({ isBlocked }), context);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).isBlocked, isBlocked);
  }
  assert.deepEqual(a.writes.map(write => write.$set.isBlocked), [true, true, false]);
});
test('delete passes the awaited ID and typed confirmation to transactional cleanup', async () => {
  const a = api();
  assert.equal((await a.routes.DELETE(a.request({ confirmation: 'person@example.com' }), context)).status, 200);
  assert.deepEqual(a.writes, [[id, 'person@example.com']]);
});
test('existing bearer sessions reject blocked and deleted users; active users continue', async () => {
  for (const [user, status] of [[{ isBlocked: true }, 403], [null, 401], [{ isBlocked: false }, 200]]) {
    const { middleware } = load('src/middleware.ts', {
      jose: { jwtVerify: async () => ({ payload: { role: 'user', userId: id } }) },
      '@/lib/db': { connectDB: async () => {} },
      '@/models/User': { User: { findById: () => ({ select: async () => user }) } },
    });
    const response = await middleware(new NextRequest('http://localhost/api/users/profile', { headers: { authorization: 'Bearer test' } }));
    assert.equal(response.status, status);
  }
});

function deletion({ confirmation = 'person@example.com', failAt, missing = false, standalone = false } = {}) {
  const writes = [];
  let rolledBack = false;
  let ended = false;
  let savedPlan;
  let blocked = false;
  let fail = failAt;
  let removed = false;
  const session = { withTransaction: async callback => { try { if (standalone) throw Object.assign(new Error('Transaction numbers are only allowed on a replica set member or mongos'), { code: 20 }); await callback(); } catch (error) { rolledBack = true; throw error; } }, endSession: async () => { ended = true; } };
  const q = value => ({ select() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); }, session: async actual => { assert.equal(actual, standalone ? null : session); return value; } });
  const mocks = { mongoose: { startSession: async () => session }, '@/cron/cronRegistry': { cronJobRegistry: new Map() } };
  const names = ['User', 'Posts', 'Comments', 'Reactions', 'Shares', 'FavoriteActivities', 'UserActivityLogs', 'UserLoginStreak', 'UserPurchase', 'Support', 'UserScheduleNotification', 'ScheduledCronJob', 'PendingRegistration'];
  for (const name of names) {
    const values = name === 'Posts' ? [{ _id: 'own-post' }] : name === 'Comments' ? [{ _id: 'own-comment', postId: 'other-post', parentCommentId: 'parent' }] : name === 'Reactions' ? [{ targetType: 'post', targetId: 'other-post' }] : [];
    const model = { findById: () => q(missing ? null : { _id: id, email: 'person@example.com', deletionPlan: savedPlan }), find: () => q(removed ? [] : values), countDocuments: () => q(2) };
    for (const op of ['deleteMany', 'deleteOne', 'updateMany', 'updateOne']) model[op] = async (...args) => {
      assert.equal(args.at(-1).session, standalone ? undefined : session, `${name}.${op} must participate in the transaction`);
      writes.push({ name, op, filter: args[0], update: args[1] });
      if (name === fail) { fail = undefined; throw new Error('database failure'); }
      if (name === 'User' && op === 'updateOne') {
        if (args[1].$set.isBlocked) blocked = true;
        if (args[1].$set.deletionPlan && !savedPlan) savedPlan = args[1].$set.deletionPlan;
      }
      if (name === 'Posts' && op === 'deleteMany') removed = true;
    };
    mocks[`@/models/${name}`] = { [name]: model };
  }
  const helper = load('src/lib/deleteUserAccount.ts', mocks);
  return { run: () => helper.deleteUserAccount(id, confirmation), writes, recovery: () => ({ savedPlan, blocked }), state: () => ({ rolledBack, ended }) };
}
test('wrong confirmation and missing accounts never delete records', async () => {
  for (const options of [{ confirmation: 'wrong' }, { missing: true }]) {
    const d = deletion(options);
    await assert.rejects(d.run());
    assert.equal(d.writes.length, 0);
    assert.deepEqual(d.state(), { rolledBack: true, ended: true });
  }
});
test('deletion cleans dependent data and repairs community counts in the same transaction', async () => {
  const d = deletion();
  await d.run();
  for (const name of ['Reactions', 'Shares', 'Comments', 'Posts', 'FavoriteActivities', 'UserActivityLogs', 'UserLoginStreak', 'UserPurchase', 'Support', 'UserScheduleNotification', 'ScheduledCronJob', 'PendingRegistration']) assert.ok(d.writes.some(write => write.name === name && write.op === 'deleteMany'), name);
  const replies = d.writes.find(write => write.name === 'Comments' && write.op === 'updateMany');
  assert.equal(replies.update.$set.parentCommentId, null);
  const counts = d.writes.find(write => write.name === 'Posts' && write.op === 'updateOne');
  assert.equal(counts.update.$set.likesCount, 2);
  assert.equal(d.writes.at(-1).name, 'User');
  assert.deepEqual(d.state(), { rolledBack: false, ended: true });
});
test('cleanup failure aborts the transaction and does not reach account deletion', async () => {
  const d = deletion({ failAt: 'UserPurchase' });
  await assert.rejects(d.run(), /database failure/);
  assert.equal(d.writes.some(write => write.name === 'User'), false);
  assert.deepEqual(d.state(), { rolledBack: true, ended: true });
});

test('standalone deletion persists a plan before cleanup and deletes the account last', async () => {
  const d = deletion({ standalone: true });
  await d.run();
  assert.equal(d.recovery().blocked, true);
  assert.ok(d.recovery().savedPlan);
  assert.equal(d.writes[0].name, 'User');
  assert.equal(d.writes[0].update.$set.deletionPending, true);
  assert.equal(d.writes.at(-1).op, 'deleteOne');
});
test('standalone cleanup can retry after partial deletion using the original references', async () => {
  const d = deletion({ standalone: true, failAt: 'UserPurchase' });
  await assert.rejects(d.run(), /database failure/);
  assert.equal(d.recovery().blocked, true);
  assert.equal(d.writes.some(w => w.name === 'User' && w.op === 'deleteOne'), false);
  const offset = d.writes.length;
  await d.run();
  const retry = d.writes.slice(offset);
  const posts = retry.find(w => w.name === 'Posts' && w.op === 'deleteMany');
  assert.deepEqual(posts.filter._id.$in, ['own-post']);
  assert.ok(retry.some(w => w.name === 'Posts' && w.op === 'updateOne' && w.filter._id === 'other-post'));
  assert.equal(retry.at(-1).name, 'User');
});
test('standalone confirmation mismatch makes no writes', async () => {
  const d = deletion({ standalone: true, confirmation: 'wrong' });
  await assert.rejects(d.run(), /Confirmation/);
  assert.equal(d.writes.length, 0);
});

test('partially deleted accounts cannot be unblocked', async () => {
  const a = api('admin', true);
  const response = await a.routes.PATCH(a.request({ isBlocked: false }), context);
  assert.equal(response.status, 409);
  assert.equal(a.writes.length, 0);
});
