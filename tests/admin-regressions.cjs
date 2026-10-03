const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { NextRequest } = require('next/server');

// Load route modules with database/storage adapters stubbed: never touch real data.
function loadModule(file, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) throw new Error(`Unexpected application dependency: ${name}`);
    return require(name);
  }, module, module.exports);
  return module.exports;
}

const modelMocks = Activity => ({
  '@/lib/db': { connectDB: async () => {} },
  '@/models/Activity': { Activity },
  '@/models/Category': {},
  '@/models/Tags': { Tags: { find: async () => [], insertMany: async () => [] } },
  '@/lib/s3': { uploadToS3: () => { throw new Error('Unexpected upload'); } },
});

test('admin authentication rejects missing, invalid, expired, and non-admin cookies', async () => {
  const { SignJWT } = await import('jose');
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-secret-not-a-real-credential';
  try {
    const { middleware } = loadModule('src/middleware.ts');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = (role, expiry = '1h') => new SignJWT({ role, adminId: 'test' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime(expiry).sign(secret);
    for (const cookie of ['', 'invalid', await token('user'), await token('admin', '-1h')]) {
      const response = await middleware(new NextRequest('http://localhost/api/admin/users', { headers: { cookie: `admin_session=${cookie}` } }));
      assert.equal(response.status, 401);
      assert.equal((await response.json()).message, 'Unauthorized');
    }
    const authorized = await middleware(new NextRequest('http://localhost/api/admin/users', { headers: { cookie: `admin_session=${await token('admin')}` } }));
    assert.equal(authorized.headers.get('x-middleware-next'), '1');
    for (const endpoint of ['/api/admin/login', '/api/admin/logout']) {
      const response = await middleware(new NextRequest(`http://localhost${endpoint}`));
      assert.equal(response.headers.get('x-middleware-next'), '1');
    }
    const page = await middleware(new NextRequest('http://localhost/admin/dashboard', { headers: { accept: 'text/html' } }));
    assert.equal(page.headers.get('location'), 'http://localhost/admin/login');
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous;
  }
});

test('logout expires the admin cookie without redirecting a POST to another host', async () => {
  let cookie;
  const { POST } = loadModule('src/app/api/admin/logout/route.ts', { 'next/headers': { cookies: async () => ({ set: (...args) => { cookie = args; } }) } });
  const response = await POST();
  assert.equal(response.status, 200);
  assert.equal(cookie[0], 'admin_session');
  assert.equal(cookie[1], '');
  assert.equal(cookie[2].expires.getTime(), 0);
  assert.equal(cookie[2].path, '/');
});

test('activity detail includes edit fields and joins the actual category and tags', async () => {
  let pipeline;
  const { GET } = loadModule('src/app/api/admin/activities/[id]/route.ts', modelMocks({ aggregate: async value => { pipeline = value; return [{ name: 'Test activity' }]; } }));
  const response = await GET(new NextRequest('http://localhost/api/admin/activities/507f1f77bcf86cd799439011'), { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) });
  assert.equal(response.status, 200);
  assert.equal(pipeline.find(stage => stage.$lookup?.from === 'categories').$lookup.localField, 'category');
  assert.equal(pipeline.find(stage => stage.$lookup?.from === 'tags').$lookup.localField, 'tags');
  const projection = pipeline.find(stage => stage.$project).$project;
  for (const field of ['thumbnail', 'tags', 'category', 'contentType', 'contentId', 'duration', 'scheduleDate', 'schedulePublish']) assert.equal(projection[field], 1, field);
});

test('activity edit persists the schedule date separately from its boolean flag', async () => {
  for (const date of ['2026-12-25', '']) {
    let payload;
    const { PATCH } = loadModule('src/app/api/admin/activities/[id]/route.ts', modelMocks({ findByIdAndUpdate: async (_, update) => { payload = update; return { _id: 'test', ...update }; } }));
    const form = new FormData();
    form.set('name', 'Test'); form.set('description', 'Test description'); form.set('scheduleDate', date);
    const response = await PATCH(new NextRequest('http://localhost/api/admin/activities/507f1f77bcf86cd799439011', { method: 'PATCH', body: form }), { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) });
    assert.equal(response.status, 200);
    assert.equal(payload.scheduleDate, date);
    assert.equal(payload.schedulePublish, Boolean(date));
    assert.equal(payload.scheduleTime, undefined, 'Preserve the existing scheduled time');
  }
});

test('activity update reports a deleted record rather than success', async () => {
  const { PATCH } = loadModule('src/app/api/admin/activities/[id]/route.ts', modelMocks({ findByIdAndUpdate: async () => null }));
  const form = new FormData(); form.set('name', 'Test'); form.set('description', 'Test');
  const response = await PATCH(new NextRequest('http://localhost/api/admin/activities/507f1f77bcf86cd799439011', { method: 'PATCH', body: form }), { params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }) });
  assert.equal(response.status, 404);
});

test('users end-date includes the full day and does not return password fields', async () => {
  let query, selection;
  const chain = { select: fields => { selection = fields; return chain; }, sort: () => chain, skip: () => chain, limit: async () => [] };
  const { GET } = loadModule('src/app/api/admin/users/route.ts', { '@/lib/db': { connectDB: async () => {} }, '@/models/User': { User: { countDocuments: async filter => { query = filter; return 0; }, find: () => chain } } });
  const response = await GET(new NextRequest('http://localhost/api/admin/users?endDate=2026-10-04'));
  assert.equal(response.status, 200);
  assert.equal(query.createdAt.$lte.toISOString(), '2026-10-04T23:59:59.999Z');
  assert.equal(selection, 'name email isBlocked createdAt');
});
