const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the real route with isolated database/JWT adapters; no live accounts.
function route(existingUser) {
  const writes = [];
  const modules = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({
      body, status: options.status || 200, cookies: { set() {} },
    }) } },
    jsonwebtoken: { sign: () => 'test-session' },
    '@/lib/db': { connectDB: async () => {} },
    '@/models/User': { User: {
      findOne: async () => existingUser,
      findByIdAndUpdate: async (_, value) => writes.push(value),
      create: async value => { writes.push(value); return { ...value, _id: 'test-id' }; },
    } },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/app/api/auth/socialLogin/route.ts'), 'utf8');
  const sandbox = { exports: {}, require: name => modules[name],
    process: { env: { JWT_SECRET: 'test-only' } }, console };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  } }).outputText, sandbox);
  return { post: body => sandbox.exports.POST({ json: async () => body }), writes };
}
const identity = { login_medium: 'google', email: 'test@example.com', social_id: 'test-id' };
for (const fcmToken of [undefined, null, '']) {
  test(`existing account can sign in with push token ${String(fcmToken)}`, async () => {
    const api = route({ _id: 'test-id', provider: 'google', email: identity.email, fcmToken: 'saved-token' });
    const response = await api.post({ ...identity, fcmToken });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.token, 'test-session');
    assert.equal(api.writes.length, 0); // Preserve the existing notification token.
  });
}
test('new Google user can sign in without push registration', async () => {
  const api = route(null);
  const response = await api.post(identity);
  assert.equal(response.status, 200);
  assert.equal(api.writes[0].provider, 'google');
});
test('available push token is saved', async () => {
  const api = route({ _id: 'test-id', provider: 'google', email: identity.email });
  assert.equal((await api.post({ ...identity, fcmToken: 'new-token' })).status, 200);
  assert.equal(api.writes[0].fcmToken, 'new-token');
});
test('required identity fields still reject an incomplete request', async () => {
  const api = route(null);
  assert.equal((await api.post({})).status, 400);
  assert.equal(api.writes.length, 0);
});
test('provider mismatch remains an explicit rejection', async () => {
  const api = route({ provider: 'password' });
  const response = await api.post(identity);
  assert.equal(response.status, 400);
  assert.match(response.body.message, /password/);
  assert.equal(api.writes.length, 0);
});

for (const fcmToken of [undefined, null, '']) {
  test(`Apple sign-in accepts push token ${String(fcmToken)} for new and existing accounts`, async () => {
    const appleIdentity = { ...identity, login_medium: 'apple', fcmToken };
    const existing = route({ _id: 'test-id', provider: 'apple', email: identity.email, fcmToken: 'saved-token' });
    const response = await existing.post(appleIdentity);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.token, 'test-session');
    assert.equal(existing.writes.length, 0);
    const newAccount = route(null);
    assert.equal((await newAccount.post(appleIdentity)).status, 200);
    assert.equal(newAccount.writes[0].provider, 'apple');
  });
}
