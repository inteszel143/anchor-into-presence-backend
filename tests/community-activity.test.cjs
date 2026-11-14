const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const mongoose = require('mongoose');
const { NextRequest, NextResponse } = require('next/server');
const alice = '000000000000000000000001';
const bob = '000000000000000000000002';
function setup() {
  let identity = { userId: alice, role: 'user' };
  const users = new Map([[alice, {}], [bob, {}]]);
  const posts = [];
  let writes = 0;
  const modules = {
    'next/server': { NextResponse }, mongoose,
    '@/lib/db': { connectDB: async () => {} },
    '@/lib/getUserFromRequest': { getUserFromRequest: async () => identity },
    '@/lib/apiResponse': { apiErrorResponse: () => NextResponse.json({}, { status: 500 }) },
    '@/models/User': { User: {
      updateOne: async (filter, update) => {
        writes++;
        const user = users.get(filter._id);
        if (!user) return;
        if (update.$set && !user.communityVisitedAt) user.communityVisitedAt = update.$set.communityVisitedAt;
        if (update.$max && update.$max.communityVisitedAt > user.communityVisitedAt) user.communityVisitedAt = update.$max.communityVisitedAt;
      },
      findById: id => ({ select: () => ({ lean: async () => users.get(id) }) }),
    } },
    '@/models/Posts': { Posts: { aggregate: async pipeline => {
      const match = pipeline[0].$match;
      assert.equal(pipeline[1].$lookup.from, 'users');
      assert.equal(pipeline[2].$unwind, '$author');
      return [{ total: posts.filter(p => p.createdAt > match.createdAt.$gt && p.userId !== String(match.userId.$ne) && users.has(p.userId)).length }];
    } } },
  };
  const source = ts.transpileModule(fs.readFileSync('src/app/api/users/community/activity/route.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const context = { exports: {}, console, Date, require: name => { assert.ok(name in modules, name); return modules[name]; } };
  vm.runInNewContext(source, context);
  return { ...context.exports, users, posts, setIdentity: value => identity = value, writes: () => writes };
}
const get = () => new NextRequest('https://example.test/api/users/community/activity');
const patch = visitedThrough => new NextRequest('https://example.test/api/users/community/activity', {
  method: 'PATCH', body: JSON.stringify({ visitedThrough, userId: bob }),
});
test('first visit starts at zero; count excludes own and orphan posts and spans the whole feed', async () => {
  const api = setup();
  api.posts.push({ userId: bob, createdAt: new Date('2020-01-01') });
  const response = await api.GET(get());
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).newPostCount, 0);
  api.users.get(alice).communityVisitedAt = new Date('2021-01-01');
  for (let i = 0; i < 15; i++) api.posts.push({ userId: bob, createdAt: new Date('2022-01-01') });
  api.posts.push({ userId: alice, createdAt: new Date('2022-01-01') }, { userId: 'deleted', createdAt: new Date('2022-01-01') });
  assert.equal((await (await api.GET(get())).json()).newPostCount, 15);
});
test('visit uses feed boundary, preserves newer posts, is monotonic and user scoped', async () => {
  const api = setup();
  api.users.get(alice).communityVisitedAt = new Date('2021-01-01');
  api.posts.push({ userId: bob, createdAt: new Date('2022-01-01') }, { userId: bob, createdAt: new Date('2023-01-01') });
  assert.equal((await (await api.PATCH(patch('2022-01-01T00:00:00.000Z'))).json()).newPostCount, 1);
  assert.equal((await (await api.PATCH(patch('2021-01-01T00:00:00.000Z'))).json()).newPostCount, 1);
  assert.equal(api.users.get(bob).communityVisitedAt, undefined);
});
test('first request may acknowledge a feed without clearing posts arriving during loading', async () => {
  const api = setup();
  api.posts.push({ userId: bob, createdAt: new Date('2023-01-01') });
  assert.equal((await (await api.PATCH(patch('2022-01-01T00:00:00.000Z'))).json()).newPostCount, 1);
});
test('unauthorized and invalid timestamps do not write', async () => {
  const api = setup();
  for (const identity of [null, { userId: alice, role: 'admin' }]) {
    api.setIdentity(identity);
    assert.equal((await api.GET(get())).status, 401);
    assert.equal((await api.PATCH(patch('2022-01-01'))).status, 401);
  }
  api.setIdentity({ userId: alice, role: 'user' });
  for (const value of [null, 'bad', '2999-01-01']) assert.equal((await api.PATCH(patch(value))).status, 400);
  assert.equal(api.writes(), 0);
});
