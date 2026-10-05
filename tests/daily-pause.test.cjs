const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const mongoose = require('mongoose');
const { NextRequest, NextResponse } = require('next/server');

function load(file, modules = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const sandbox = { exports: {}, console, File, crypto: require('node:crypto').webcrypto,
    require: name => {
      assert.ok(name in modules, `Unexpected import ${name}`);
      return modules[name];
    } };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.exports;
}
const media = load('src/lib/activityMedia.ts');
const category = '000000000000000000000001';
const id = '000000000000000000000002';
const params = { params: Promise.resolve({ id }) };
const image = () => new File(['quote image'], 'quote.png', { type: 'image/png' });
const video = () => new File(['video'], 'practice.mp4', { type: 'video/mp4' });

function setup(categoryName = 'Daily Pause', initial = {}, upload) {
  const uploads = [];
  let stored = { _id: id, category, ...initial };
  const modules = {
    'next/server': { NextResponse }, mongoose,
    '@/lib/db': { connectDB: async () => {} },
    '@/lib/activityMedia': media,
    '@/models/Category': { Category: { findById: async () => ({ name: categoryName }) } },
    '@/models/Activity': { Activity: {
      findById: async () => stored,
      create: async data => (stored = { ...data, _id: id }),
      findByIdAndUpdate: async (_, data) => {
        for (const [key, value] of Object.entries(data)) if (value !== undefined) stored[key] = value;
        return stored;
      },
    } },
    '@/models/Tags': { Tags: {} },
    '@/lib/s3': { uploadToS3: async file => {
      uploads.push(file);
      if (upload) await upload(file);
      return `/uploads/${file.name}`;
    } },
    '@/lib/apiResponse': { apiErrorResponse: () => NextResponse.json({}, { status: 500 }) },
  };
  return {
    post: load('src/app/api/admin/activities/create/route.ts', modules).POST,
    patch: load('src/app/api/admin/activities/[id]/route.ts', modules).PATCH,
    uploads, saved: () => stored,
  };
}
function request(fields, method = 'POST') {
  const form = new FormData();
  for (const [key, value] of Object.entries({ name: 'Pause', description: 'Take a breath', category, ...fields })) {
    form.set(key, value);
  }
  return new NextRequest('http://localhost/api/admin/activities', { method, body: form });
}

test('create a scheduled Daily Pause with only its image and no duration', async () => {
  const app = setup();
  const res = await app.post(request({ thumbnail: image(), schedulePublish: 'true', scheduleDate: '2026-10-06', scheduleTime: '08:30' }));
  assert.equal(res.status, 201);
  const saved = app.saved();
  assert.equal(saved.video, '');
  assert.equal(saved.thumbnail, '/uploads/quote.png');
  assert.equal(saved.contentType, 'Image');
  assert.equal(saved.duration, '0');
  assert.equal(saved.schedulePublish, 'true');
  assert.equal(saved.scheduleDate, '2026-10-06');
  assert.equal(saved.scheduleTime, '08:30');
  assert.equal(app.uploads.length, 1);
});

test('Daily Pause rejects missing, empty, and non-image uploads before saving', async () => {
  for (const fields of [{}, { thumbnail: video() }, { thumbnail: '' }, { thumbnail: new File([], 'empty.png', { type: 'image/png' }) }]) {
    const app = setup();
    assert.equal((await app.post(request(fields))).status, 400);
    assert.equal(app.uploads.length, 0);
  }
});

test('Daily Pause does not upload a leftover video from category switching', async () => {
  const app = setup();
  assert.equal((await app.post(request({ thumbnail: image(), media: video(), contentType: 'Video' }))).status, 201);
  assert.equal(app.uploads.length, 1);
  assert.equal(app.saved().video, '');
});

test('editing a legacy pause preserves its image, video, and schedule without reupload', async () => {
  const app = setup('Daily Pause', { thumbnail: '/old.png', video: '/old.mp4', contentType: 'Video', scheduleDate: '2026-10-06', scheduleTime: '09:00' });
  assert.equal((await app.patch(request({}, 'PATCH'), params)).status, 200);
  assert.equal(app.saved().thumbnail, '/old.png');
  assert.equal(app.saved().video, '/old.mp4');
  assert.equal(app.saved().scheduleDate, '2026-10-06');
  assert.equal(app.saved().scheduleTime, '09:00');
  assert.equal(app.uploads.length, 0);
  assert.equal(media.getActivityImage({ ...app.saved(), taggedCategories: [{ name: 'Daily Pause' }] }), '/old.png');
});

test('replace a pause image and reschedule without replacing legacy media', async () => {
  const app = setup('Daily Pause', { video: '/old.mp4', thumbnail: '/old.png' });
  const res = await app.patch(request({ thumbnail: image(), scheduleDate: '2026-10-07', scheduleTime: '10:30' }, 'PATCH'), params);
  assert.equal(res.status, 200);
  assert.equal(app.saved().thumbnail, '/uploads/quote.png');
  assert.equal(app.saved().video, '/old.mp4');
  assert.equal(app.saved().schedulePublish, true);
  assert.equal(app.saved().scheduleDate, '2026-10-07');
  assert.equal(app.saved().scheduleTime, '10:30');
  assert.equal((await app.patch(request({ thumbnail: video() }, 'PATCH'), params)).status, 400);
  assert.equal(app.saved().thumbnail, '/uploads/quote.png');
});

test('legacy video-only pause retains its content type when edited', async () => {
  const app = setup('Daily Pause', { video: '/legacy.mp4', contentType: 'Video' });
  assert.equal((await app.patch(request({ contentType: 'Image' }, 'PATCH'), params)).status, 200);
  assert.equal(app.saved().contentType, 'Video');
  assert.equal(app.saved().video, '/legacy.mp4');
});

test('video and audio categories retain their media uploads, thumbnails, and duration', async () => {
  for (const contentType of ['Video', 'Audio']) {
    const app = setup('Daily Anchor');
    const file = contentType === 'Video' ? video() : new File(['audio'], 'practice.mp3', { type: 'audio/mpeg' });
    assert.equal((await app.post(request({ thumbnail: image(), media: file, contentType, duration: '15' }))).status, 201);
    assert.equal(app.saved().contentType, contentType);
    assert.equal(app.saved().duration, '15');
    assert.equal(app.saved().video, `/uploads/${file.name}`);
    assert.equal(app.uploads.length, 2);
    assert.equal((await app.patch(request({ video: file, contentType }, 'PATCH'), params)).status, 200);
    assert.equal(app.uploads.length, 3);
    assert.equal(media.getActivityImage({ ...app.saved(), taggedCategories: [{ name: 'Daily Anchor' }] }), '');
  }
});

test('preview prefers existing pause images and supports legacy image media only for pauses', () => {
  const pause = { taggedCategories: [{ name: ' Daily Pause ' }], contentType: 'Video', thumbnail: '/quote.png', video: '/old.mp4' };
  assert.equal(media.getActivityImage(pause), '/quote.png');
  assert.equal(media.getActivityImage({ ...pause, thumbnail: '', video: '/quote.jpg?key=1' }), '/quote.jpg?key=1');
  assert.equal(media.getActivityImage({ ...pause, thumbnail: '', video: '/old.mp4' }), '');
  assert.equal(media.getActivityImage({ ...pause, taggedCategories: [{ name: 'Daily Anchor' }] }), '');
  assert.equal(media.getActivityImage({ thumbnail: '/quote.png', taggedCategoriesData: [{ name: 'Daily Pauses' }] }), '/quote.png');
});


test('video and thumbnail uploads overlap, and saving waits for both', async () => {
  const pending = [];
  let started;
  const bothStarted = new Promise(resolve => { started = resolve; });
  const app = setup('Daily Anchor', {}, () => new Promise(resolve => {
    pending.push(resolve);
    if (pending.length === 2) started();
  }));
  const response = app.post(request({ thumbnail: image(), media: video(), contentType: 'Video' }));
  await bothStarted;
  assert.equal(app.saved().thumbnail, undefined);
  pending[0]();
  await Promise.resolve();
  assert.equal(app.saved().thumbnail, undefined);
  pending[1]();
  assert.equal((await response).status, 201);
  assert.equal(app.saved().thumbnail, '/uploads/quote.png');
  assert.equal(app.saved().video, '/uploads/practice.mp4');
});
