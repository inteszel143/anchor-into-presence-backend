const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const mongoose = require('mongoose');
const { NextRequest, NextResponse } = require('next/server');
const id = '000000000000000000000001';
function setup(options = {}) {
  let queried = false;
  const query = value => ({ select: () => ({ lean: async () => value }) });
  const modules = {
    'next/server': { NextResponse }, mongoose,
    '@/lib/db': { connectDB: async () => {} },
    '@/lib/getUserFromRequest': { getUserFromRequest: async () => options.unauthorized ? null : { userId: id, role: 'user' } },
    '@/models/User': { User: {
      findById: () => query(options.blocked ? { isBlocked: true } : {}),
      findOne: filter => {
        queried = true;
        assert.equal(filter.isBlocked.$ne, true);
        assert.equal(filter.deletionPending.$ne, true);
        return query(options.deleted ? null : { _id: id, name: 'Tina', image: '/photo.png', createdAt: '2026-01-01', email: 'private', password: 'secret' });
      },
    } },
    '@/models/Posts': { Posts: {
      findOne: filter => {
        assert.equal(filter.postAnonymously.$ne, true);
        return query(options.anonymous ? null : { userId: id });
      },
      countDocuments: async filter => {
        assert.equal(filter.postAnonymously.$ne, true);
        assert.equal(filter.userId, id);
        return 2;
      },
    } },
  };
  const source = ts.transpileModule(fs.readFileSync('src/app/api/users/community/posts/[postId]/author/route.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const context = { exports: {}, require: name => modules[name] };
  vm.runInNewContext(source, context);
  return { get: postId => context.exports.GET(new NextRequest('https://example.test'), { params: Promise.resolve({ postId: postId ?? id }) }), queried: () => queried };
}
test('public profile returns only the allowed fields and excludes anonymous posts from count', async () => {
  const response = await setup().get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual((await response.json()).data, { name: 'Tina', image: '/photo.png', memberSince: '2026-01-01', publicPostCount: 2 });
});
test('anonymous and missing authors do not expose profiles', async () => {
  const api = setup({ anonymous: true });
  assert.equal((await api.get()).status, 404);
  assert.equal(api.queried(), false);
  assert.equal((await setup({ deleted: true }).get()).status, 404);
});
test('rejects unauthenticated, blocked and malformed requests', async () => {
  assert.equal((await setup({ unauthorized: true }).get()).status, 401);
  assert.equal((await setup({ blocked: true }).get()).status, 401);
  assert.equal((await setup().get('bad')).status, 400);
});
