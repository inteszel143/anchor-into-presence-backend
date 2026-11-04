const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');

function load(modules) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/app/api/app-version/route.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const sandbox = {
    exports: {},
    console,
    require: name => {
      if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
      return modules[name];
    },
  };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.exports;
}

test('public app version endpoint returns only the mobile release settings without authentication', async () => {
  let projection;
  const { GET } = load({
    'next/server': { NextResponse },
    '@/lib/db': { connectDB: async () => {} },
    '@/models/AppSettings': {
      AppSettings: {
        findOne: query => {
          assert.equal(query.key, 'global');
          return {
            select: fields => {
              projection = fields;
              return { lean: async () => ({
                android_version: '1.12.0',
                ios_version: '1.12.1',
                android_is_approved: true,
                ios_is_approved: false,
                is_under_maintenance: true,
                internal_note: 'not public',
              }) };
            },
          };
        },
      },
    },
  });

  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(projection, /android_version/);
  const body = await response.json();
  assert.deepEqual(JSON.parse(JSON.stringify(body.settings)), {
    android_version: '1.12.0',
    ios_version: '1.12.1',
    android_is_approved: true,
    ios_is_approved: false,
    is_under_maintenance: true,
  });
  assert.equal('internal_note' in body.settings, false);
});

test('public app version endpoint returns safe defaults before settings are created', async () => {
  const { GET } = load({
    'next/server': { NextResponse },
    '@/lib/db': { connectDB: async () => {} },
    '@/models/AppSettings': {
      AppSettings: { findOne: () => ({ select: () => ({ lean: async () => null }) }) },
    },
  });

  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify((await response.json()).settings)), {
    android_version: '',
    ios_version: '',
    android_is_approved: false,
    ios_is_approved: false,
    is_under_maintenance: false,
  });
});
