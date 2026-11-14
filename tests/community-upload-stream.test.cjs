const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { PassThrough } = require('node:stream');
const { NextRequest } = require('next/server');
const { getCloneableBody } = require('next/dist/server/body-streams');
const { NextRequestAdapter } = require('next/dist/server/web/spec-extension/adapters/next-request');

function middleware(user = { isBlocked: false }) {
  const exports = {};
  const mocks = {
    jose: { jwtVerify: async () => ({ payload: { role: 'user', userId: 'a'.repeat(24) } }) },
    '@/lib/db': { connectDB: async () => {} },
    '@/models/User': { User: { findById: () => ({ select: async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return user;
    } }) } },
  };
  const code = ts.transpileModule(fs.readFileSync('src/middleware.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', code)(name => mocks[name] || require(name), exports);
  return exports.middleware;
}

test('slow multipart image upload survives Node middleware and reaches formData intact', async () => {
  const image = Buffer.alloc(256 * 1024, 0x61);
  const prefix = Buffer.from('--upload\r\nContent-Disposition: form-data; name="message"\r\n\r\nPhoto\r\n--upload\r\nContent-Disposition: form-data; name="images"; filename="photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n');
  const suffix = Buffer.from('\r\n--upload--\r\n');
  const input = new PassThrough();
  const clone = getCloneableBody(input, 212 * 1024 * 1024);
  const headers = { authorization: 'Bearer test', 'content-type': 'multipart/form-data; boundary=upload' };
  const url = 'http://localhost/api/users/community/posts';
  const req = new NextRequest(url, { method: 'POST', headers, body: clone.cloneBodyStream(), duplex: 'half' });
  input.write(prefix);
  const finish = setTimeout(() => input.end(Buffer.concat([image, suffix])), 60);
  try {
    const response = await middleware()(req);
    assert.equal(response.status, 200);
    // Next 15 Node middleware calls finalize without awaiting it. Reproduce
    // that handoff, including its microtask turn before creating the route request.
    const finalized = clone.finalize();
    await Promise.resolve();
    const routeReq = NextRequestAdapter.fromNodeNextRequest({ method: 'POST', url, headers, body: input }, new AbortController().signal);
    const form = await routeReq.formData();
    assert.equal(form.get('message'), 'Photo');
    assert.equal(form.get('images').name, 'photo.jpg');
    assert.deepEqual(Buffer.from(await form.get('images').arrayBuffer()), image);
    await finalized;
  } finally {
    clearTimeout(finish);
    input.end();
  }
});

test('blocked users are rejected without waiting for an unfinished image body', async () => {
  const input = new PassThrough();
  const req = new NextRequest('http://localhost/api/users/community/posts', {
    method: 'POST', headers: { authorization: 'Bearer test' }, body: input, duplex: 'half',
  });
  try {
    assert.equal((await middleware({ isBlocked: true })(req)).status, 403);
  } finally { input.end(); }
});
