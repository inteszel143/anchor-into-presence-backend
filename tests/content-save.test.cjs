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
  const sandbox = { exports: {}, console, TextEncoder, process: { env: { JWT_SECRET: 'isolated-test-secret' } }, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
    return modules[name];
  } };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.exports;
}

test('content model survives route reloads and preserves its collection', () => {
  const mongoose = new Mongoose();
  const first = load('src/models/Content.ts', { mongoose }).Content;
  assert.equal(first.modelName, 'contents');
  for (let i = 0; i < 3; i++) {
    const next = load('src/models/Content.ts', { mongoose }).Content;
    assert.equal(next, first);
    assert.equal(next.collection.name, 'contents');
  }
});

function routes(content) {
  const modules = {
    'next/server': { NextResponse },
    '@/lib/db': { connectDB: async () => {} },
    '@/models/Content': { Content: content },
    '@/lib/apiResponse': { apiErrorResponse: () => NextResponse.json({ status: false }, { status: 500 }) },
    mongoose: new Mongoose(),
    jose: { jwtVerify: async () => ({ payload: { role: 'admin' } }) },
  };
  return { patch: load('src/app/api/admin/content/[id]/route.ts', modules).PATCH,
    post: load('src/app/api/admin/content/route.ts', modules).POST };
}
function request(body, method = 'PATCH', authenticated = true) {
  return new NextRequest('http://localhost/api/admin/content', { method,
    headers: { 'Content-Type': 'application/json', ...(authenticated ? { Cookie: 'admin_session=test-session' } : {}) },
    body: JSON.stringify(body) });
}

test('missing document returns 404 instead of a generic server error', async () => {
  const { patch } = routes({ findById: async () => null });
  const res = await patch(request({ description: 'Draft' }), { params: Promise.resolve({ id: '000000000000000000000000' }) });
  assert.equal(res.status, 404);
});

test('invalid IDs and non-text descriptions are rejected before database writes', async () => {
  const { patch } = routes({ findById: () => assert.fail('Should not query') });
  assert.equal((await patch(request({ description: 'Draft' }), { params: Promise.resolve({ id: 'undefined' }) })).status, 400);
  assert.equal((await patch(request({ description: 42 }), { params: Promise.resolve({ id: '000000000000000000000000' }) })).status, 400);
});

test('first save creates the chosen document and returns its ID', async () => {
  const { post } = routes({ findOneAndUpdate: async (query, update, options) => {
    assert.equal(query.contentType, 'terms');
    assert.equal(update.$set.description, '<p>Draft</p>');
    assert.equal(options.upsert, true);
    return { _id: 'document-id', description: update.$set.description };
  } });
  const res = await post(request({ contentType: 'terms', description: '<p>Draft</p>' }, 'POST'));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).content._id, 'document-id');
});

test('first-save endpoint requires an admin session', async () => {
  const { post } = routes({ findOneAndUpdate: () => assert.fail('Must not write') });
  assert.equal((await post(request({ contentType: 'terms', description: 'Draft' }, 'POST', false))).status, 401);
});
