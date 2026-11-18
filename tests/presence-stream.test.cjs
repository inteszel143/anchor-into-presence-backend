const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const { SignJWT } = require('jose');
function setup(readRevision) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/app/api/admin/users/presence/stream/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mocks = { '@/lib/db': { connectDB: async () => {} }, '@/lib/presenceEvents': { presenceRevision: readRevision } };
  new Function('require', 'exports', code)(name => name in mocks ? mocks[name] : require(name), exports);
  return exports;
}
test('SSE requires admin authentication, resyncs on reconnect, delivers revisions and cleans up', async () => {
  const before = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'presence-test-only';
  const token = role => new SignJWT({ role }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.JWT_SECRET));
  let revision = 'first';
  let reads = 0;
  const route = setup(async () => { reads++; return revision; });
  try {
    for (const cookie of ['', 'bad', await token('user')]) {
      assert.equal((await route.GET(new NextRequest('http://localhost/api/admin/users/presence/stream', { headers: { cookie: `admin_session=${cookie}` } }))).status, 401);
    }
    assert.equal(reads, 0);
    const cookie = `admin_session=${await token('admin')}`;
    const abort = new AbortController();
    const response = await route.GET(new NextRequest('http://localhost/api/admin/users/presence/stream', { headers: { cookie }, signal: abort.signal }));
    assert.equal(response.headers.get('content-type'), 'text/event-stream');
    assert.equal(response.headers.get('x-accel-buffering'), 'no');
    const reader = response.body.getReader();
    const decode = result => new TextDecoder().decode(result.value);
    assert.match(decode(await reader.read()), /retry: 2000/);
    assert.match(decode(await reader.read()), /"revision":"first"/);
    revision = 'second';
    assert.match(decode(await reader.read()), /"revision":"second"/);
    abort.abort();
    assert.equal((await reader.read()).done, true);
    const reconnected = await route.GET(new NextRequest('http://localhost/api/admin/users/presence/stream', { headers: { cookie } }));
    const reader2 = reconnected.body.getReader();
    await reader2.read();
    assert.match(decode(await reader2.read()), /"revision":"second"/);
    await reader2.cancel(); // Cancel must not throw or leave a timer alive.
  } finally {
    if (before === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = before;
  }
});
