const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function setup() {
  const state = { users: [], pending: null, sent: [], mailFails: false, dbFails: false, createFails: false, userWrites: 0 };
  let sequence = 0;
  const matches = (record, query) => record && Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && '$gt' in value) return record[key] > value.$gt;
    if (value && typeof value === 'object' && '$lt' in value) return record[key] < value.$lt;
    return record[key] === value;
  });
  const mocks = {
    '@/lib/db': { connectDB: async () => { if (state.dbFails) throw new Error('private database details'); } },
    '@/models/User': { User: {
      findOne: async query => state.users.find(user => matches(user, query)) || null,
      create: async data => {
        if (state.createFails) throw new Error('database write failed');
        if (state.users.some(user => user.email === data.email)) throw Object.assign(new Error('duplicate'), { code: 11000 });
        const user = { ...data, _id: ++sequence, save: async () => { state.userWrites++; } };
        state.users.push(user); state.userWrites++; return user;
      },
      findOneAndUpdate: async (query, update) => {
        const user = state.users.find(user => matches(user, query));
        if (!user) return null;
        Object.assign(user, update.$set); state.userWrites++; return user;
      },
    } },
    '@/models/PendingRegistration': { PendingRegistration: {
      findOne: async query => matches(state.pending, query) ? { ...state.pending } : null,
      findOneAndUpdate: async (query, update, options) => {
        if (options.upsert) {
          state.pending = { _id: state.pending?._id ?? ++sequence, ...update.$set };
        } else {
          if (!matches(state.pending, query)) return null;
          state.pending.attempts += update.$inc.attempts;
        }
        return { ...state.pending };
      },
      deleteOne: async query => { if (matches(state.pending, query)) state.pending = null; },
    } },
    '@/lib/sendEmail': { sendOtpEmail: async (email, otp) => {
      if (state.mailFails) throw new Error('private SendGrid details');
      state.sent.push({ email, otp });
    } },
    bcryptjs: { hash: async password => `hashed:${password}` },
  };
  function load(file) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', compiled)(name => mocks[name] ?? require(name), module, module.exports);
    return module.exports;
  }
  mocks['@/lib/registrationVerification'] = load('src/lib/registrationVerification.ts');
  const routes = Object.fromEntries(['register', 'verify-otp', 'resend-otp'].map(name => [name, load(`src/app/api/auth/${name}/route.ts`).POST]));
  const call = (route, body) => routes[route](new NextRequest(`http://localhost/api/auth/${route}`, { method: 'POST', body: JSON.stringify(body) }));
  const signup = (extra = {}) => call('register', { name: 'Test Person', email: 'person@example.com', password: 'test-password', ...extra });
  const verify = otp => call('verify-otp', { email: 'person@example.com', otp: otp ?? state.sent.at(-1)?.otp });
  const resend = () => call('resend-otp', { email: 'person@example.com' });
  return { state, signup, verify, resend, call };
}

test('successful email delivery keeps signup temporary until valid verification creates a verified user', async () => {
  const { state, signup, verify } = setup();
  assert.equal((await signup()).status, 200);
  assert.equal(state.users.length, 0);
  assert.equal(state.userWrites, 0);
  assert.equal(state.pending.password, 'hashed:test-password');
  assert.notEqual(state.pending.otpHash, state.sent[0].otp);
  assert.equal(state.pending.otpHash.length, 64);
  assert.equal((await verify()).status, 200);
  assert.equal(state.users.length, 1);
  assert.equal(state.users[0].isVerified, true);
  assert.equal(state.users[0].password, 'hashed:test-password');
  assert.equal(state.users[0].otp, null);
  assert.equal(state.pending, null);
  assert.equal((await verify()).status, 400);
});

test('SendGrid failure saves neither user nor pending signup and a later retry can succeed', async () => {
  const { state, signup } = setup();
  state.mailFails = true;
  const response = await signup();
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.status, false);
  assert.ok(!JSON.stringify(body).includes('private'));
  assert.equal(state.users.length, 0);
  assert.equal(state.pending, null);
  state.mailFails = false;
  assert.equal((await signup()).status, 200);
  assert.equal(state.users.length, 0);
  assert.ok(state.pending);
});

test('invalid, expired, and over-limit verification codes never create users', async () => {
  const { state, signup, verify } = setup();
  await signup();
  for (let i = 0; i < 5; i++) assert.equal((await verify('000000')).status, 400);
  assert.equal((await verify()).status, 400);
  assert.equal(state.users.length, 0);
  await signup();
  state.pending.otpExpiresAt = new Date(0);
  assert.equal((await verify()).status, 400);
  assert.equal(state.users.length, 0);
  state.pending.otpExpiresAt = new Date(Date.now() + 60000);
  state.pending.expiresAt = new Date(0);
  assert.equal((await verify()).status, 400);
  assert.equal(state.userWrites, 0);
});

test('resend works without a user and failed resend preserves the existing verification code', async () => {
  const { state, signup, resend, verify } = setup();
  await signup();
  const original = { ...state.pending };
  state.mailFails = true;
  assert.equal((await resend()).status, 503);
  assert.deepEqual(state.pending, original);
  state.mailFails = false;
  state.pending.otpExpiresAt = new Date(0);
  assert.equal((await resend()).status, 200);
  assert.ok(state.pending.otpExpiresAt > new Date());
  assert.equal(state.users.length, 0);
  assert.equal((await verify()).status, 200);
});

test('expired temporary signup must restart; resend does not resurrect it', async () => {
  const { state, signup, resend } = setup();
  await signup();
  state.pending.expiresAt = new Date(0);
  assert.equal((await resend()).status, 400);
  assert.equal(state.sent.length, 1);
  assert.equal(state.users.length, 0);
});

test('verified accounts cannot be replaced by signup or pending verification', async () => {
  const { state, signup, verify, resend } = setup();
  await signup();
  state.users.push({ email: 'person@example.com', password: 'existing', isVerified: true });
  assert.equal((await signup()).status, 409);
  assert.equal((await verify()).status, 409);
  assert.equal((await resend()).status, 409);
  assert.equal(state.users[0].password, 'existing');
  assert.equal(state.userWrites, 0);
});

test('database failure is generic; user-write failure retains pending verification for retry', async () => {
  const { state, signup, verify } = setup();
  state.dbFails = true;
  const response = await signup();
  assert.equal(response.status, 500);
  assert.ok(!JSON.stringify(await response.json()).includes('private'));
  state.dbFails = false;
  await signup();
  state.createFails = true;
  assert.equal((await verify()).status, 500);
  assert.ok(state.pending);
  assert.equal(state.users.length, 0);
  state.createFails = false;
  assert.equal((await verify()).status, 200);
});

test('concurrent verification requests create at most one user', async () => {
  const { state, signup, verify } = setup();
  await signup();
  const responses = await Promise.all([verify(), verify()]);
  assert.ok(responses.some(response => response.status === 200));
  assert.equal(state.users.length, 1);
});

test('legacy unverified users are not changed on signup or mail failure, only after verification', async () => {
  const { state, signup, verify } = setup();
  state.users.push({ _id: 100, email: 'person@example.com', isVerified: false, password: 'old' });
  state.mailFails = true;
  assert.equal((await signup()).status, 503);
  assert.equal(state.users[0].password, 'old');
  state.mailFails = false;
  await signup();
  assert.equal(state.users[0].password, 'old');
  assert.equal((await verify()).status, 200);
  assert.equal(state.users.length, 1);
  assert.equal(state.users[0].isVerified, true);
  assert.equal(state.users[0].password, 'hashed:test-password');
});

test('existing password recovery and legacy verification codes still work', async () => {
  for (const isVerified of [true, false]) {
    const { state, verify } = setup();
    let saves = 0;
    state.users.push({ email: 'person@example.com', isVerified, otp: '123456', otpExpiresAt: new Date(Date.now() + 60000), save: async () => saves++ });
    assert.equal((await verify('123456')).status, 200);
    assert.equal(saves, 1);
    assert.equal(state.users[0].otp, null);
  }
});

test('malformed signup requests do not send mail or write records', async () => {
  const { state, signup } = setup();
  for (const extra of [{ email: {} }, { email: 'invalid' }, { password: {} }, { password: ' ' }, { name: {} }]) {
    assert.equal((await signup(extra)).status, 400);
  }
  assert.equal(state.pending, null);
  assert.equal(state.users.length, 0);
  assert.equal(state.sent.length, 0);
});
