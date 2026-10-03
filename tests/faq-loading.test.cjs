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
  const sandbox = { exports: {}, console: { error() {} }, require: name => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  } };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.exports;
}
test('FAQ model is reusable across list, create, and edit route reloads', () => {
  const mongoose = new Mongoose();
  const first = load('src/models/Faq.ts', { mongoose }).Faq;
  assert.equal(first.collection.name, 'faqs');
  for (let i = 0; i < 4; i++) assert.equal(load('src/models/Faq.ts', { mongoose }).Faq, first);
});
test('FAQ list returns JSON on database failure instead of a framework error page', async () => {
  const { GET } = load('src/app/api/admin/faqs/route.ts', {
    'next/server': { NextResponse },
    '@/lib/db': { connectDB: async () => { throw new Error('Database unavailable'); } },
    '@/models/Faq': { Faq: {} },
  });
  const res = await GET(new NextRequest('http://localhost/api/admin/faqs'));
  assert.equal(res.status, 500);
  assert.match(res.headers.get('content-type'), /application\/json/);
  const data = await res.json();
  assert.equal(data.status, false);
  assert.match(data.message, /try again/);
});
test('FAQ list retains pagination and returns records as JSON', async () => {
  const rows = [{ _id: 'test-faq', question: 'Question', answer: 'Answer' }];
  const query = { sort() { return this; }, skip(value) { assert.equal(value, 10); return this; }, limit(value) { assert.equal(value, 10); return Promise.resolve(rows); } };
  const { GET } = load('src/app/api/admin/faqs/route.ts', {
    'next/server': { NextResponse }, '@/lib/db': { connectDB: async () => {} },
    '@/models/Faq': { Faq: { find: () => query, countDocuments: async () => 11 } },
  });
  const res = await GET(new NextRequest('http://localhost/api/admin/faqs?page=2'));
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.deepEqual(data.data, rows);
  assert.equal(data.pagination.totalPages, 2);
});
