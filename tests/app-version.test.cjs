const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');

function load(file, modules) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const sandbox = {
    exports: {},
    console,
    TextEncoder,
    process: { env: { JWT_SECRET: 'isolated-test-secret' } },
    require: name => {
      if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
      return modules[name];
    },
  };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.exports;
}

const values = {
  android_version: '2.0.0',
  ios_version: '2.0.1',
  android_is_approved: true,
  ios_is_approved: false,
  is_under_maintenance: true,
};

function route(model) {
  return load('src/app/api/admin/app-version/route.ts', {
    'next/server': { NextResponse },
    '@/lib/db': { connectDB: async () => {} },
    '@/models/AppSettings': { AppSettings: model },
    jose: { jwtVerify: async () => ({ payload: { role: 'admin' } }) },
  });
}

function request(body, authenticated = true) {
  return new NextRequest('http://localhost/api/admin/app-version', {
    method: body ? 'PUT' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated ? { Cookie: 'admin_session=test-session' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

test('settings model uses the stable app_settings collection after reloads', () => {
  const { Mongoose } = require('mongoose');
  const mongoose = new Mongoose();
  const first = load('src/models/AppSettings.ts', { mongoose }).AppSettings;
  for (let i = 0; i < 2; i++) {
    const next = load('src/models/AppSettings.ts', { mongoose }).AppSettings;
    assert.equal(next, first);
    assert.equal(next.collection.name, 'app_settings');
  }
});

test('admin can load defaults when settings have not been saved', async () => {
  const { GET } = route({ findOne: () => ({ lean: async () => null }) });
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    settings: {
      android_version: '',
      ios_version: '',
      android_is_approved: false,
      ios_is_approved: false,
      is_under_maintenance: false,
    },
  });
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('admin can save settings as a singleton record', async () => {
  let query;
  let update;
  let options;
  const { PUT } = route({
    findOneAndUpdate: (nextQuery, nextUpdate, nextOptions) => {
      query = nextQuery;
      update = nextUpdate;
      options = nextOptions;
      return { lean: async () => ({ key: 'global', ...nextUpdate.$set }) };
    },
  });
  const response = await PUT(request(values));
  assert.equal(response.status, 200);
  assert.equal(query.key, 'global');
  assert.equal(update.$set.android_version, values.android_version);
  assert.equal(options.new, true);
  assert.equal(options.upsert, true);
  assert.equal(options.runValidators, true);
  assert.deepEqual((await response.json()).settings, values);
});

test('settings writes require an admin session and valid values', async () => {
  const model = { findOneAndUpdate: () => assert.fail('Must not write') };
  const { PUT } = route(model);
  assert.equal((await PUT(request(values, false))).status, 401);
  assert.equal((await PUT(request({ ...values, android_is_approved: 'yes' }))).status, 400);
  assert.equal((await PUT(request({ ...values, ios_version: '' }))).status, 400);
  assert.equal((await PUT(request({ ...values, android_version: 'x'.repeat(33) }))).status, 400);
});
