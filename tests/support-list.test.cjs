const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { Mongoose } = require('mongoose');
const { NextRequest, NextResponse } = require('next/server');
function load(file, modules) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const sandbox = { exports: {}, URL, console: { error() {} }, require: name => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  } };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.exports;
}
test('support model survives reloads and never uses the login-streak model', () => {
  const mongoose = new Mongoose();
  mongoose.model('user_login_streaks', new mongoose.Schema({ count: Number }));
  const first = load('src/models/Support.ts', { mongoose }).Support;
  assert.equal(first.modelName, 'support');
  assert.equal(first.collection.name, 'supports');
  for (let i = 0; i < 3; i++) assert.equal(load('src/models/Support.ts', { mongoose }).Support, first);
});
test('support list honors title sorting, pagination, and the full end date', async () => {
  let captured;
  const { GET } = load('src/app/api/admin/support/route.ts', {
    'next/server': { NextResponse }, '@/lib/db': { connectDB: async () => {} },
    '@/models/Support': { Support: {
      countDocuments: async () => 11,
      aggregate: async pipeline => { captured = pipeline; return []; },
    } },
  });
  const res = await GET(new NextRequest('http://localhost/api/admin/support?sortBy=title&sortOrder=asc&page=2&limit=10&endDate=2026-10-03'));
  assert.equal(res.status, 200);
  assert.equal(captured[1].$sort.title, 1);
  assert.equal(captured[2].$skip, 10);
  assert.equal(captured[0].$match.createdAt.$lte.getHours(), 23);
  assert.equal(captured[0].$match.createdAt.$lte.getMilliseconds(), 999);
  assert.equal((await res.json()).totalPages, 2);
});
test('support list returns a JSON error if the database fails', async () => {
  const { GET } = load('src/app/api/admin/support/route.ts', {
    'next/server': { NextResponse }, '@/lib/db': { connectDB: async () => { throw new Error('offline'); } },
    '@/models/Support': { Support: {} },
  });
  const res = await GET(new NextRequest('http://localhost/api/admin/support'));
  assert.equal(res.status, 500);
  assert.match((await res.json()).message, /try again/);
});
