const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function loadRoute({ existing = null, mailFails = false, dbFails = false } = {}) {
  const saved = [];
  const mocks = {
    '@/lib/db': { connectDB: async () => { if (dbFails) throw new Error('private details'); } },
    '@/models/User': { User: { findOne: async () => existing, create: async user => saved.push(user) } },
    '@/lib/sendEmail': { sendOtpEmail: async () => { if (mailFails) throw new Error('private SMTP details'); } },
    bcryptjs: { hash: async () => 'hashed-password' },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/app/api/auth/register/route.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => mocks[name] ?? require(name), module, module.exports);
  return { POST: module.exports.POST, saved };
}
const request = () => new NextRequest('http://localhost/api/auth/register', {
  method: 'POST', body: JSON.stringify({ name: 'Test Person', email: 'person@example.com', password: 'test-password' }),
});

test('signup saves the account and reports success only after email delivery', async () => {
  const { POST, saved } = loadRoute();
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, true);
  assert.equal(saved[0].password, 'hashed-password');
});

test('email delivery failure returns a retryable JSON error and retry updates the unverified account', async () => {
  const { POST, saved } = loadRoute({ mailFails: true });
  const response = await POST(request());
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.status, false);
  assert.match(body.message, /verification email/);
  assert.ok(!JSON.stringify(body).includes('private'));
  let saves = 0;
  const existing = { ...saved[0], isVerified: false, save: async () => saves++ };
  const retry = loadRoute({ existing });
  assert.equal((await retry.POST(request())).status, 200);
  assert.equal(saves, 1);
  assert.equal(retry.saved.length, 0);
});

test('database failures return JSON without internal details', async () => {
  const { POST } = loadRoute({ dbFails: true });
  const response = await POST(request());
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.status, false);
  assert.match(body.message, /temporarily unavailable/);
  assert.ok(!JSON.stringify(body).includes('private'));
});

test('verified accounts cannot be overwritten by signup', async () => {
  const { POST, saved } = loadRoute({ existing: { isVerified: true } });
  assert.equal((await POST(request())).status, 409);
  assert.equal(saved.length, 0);
});
