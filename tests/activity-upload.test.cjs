const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup() {
  let xhr;
  class FakeXHR {
    upload = {};
    open(method, url) { assert.equal(method, 'POST'); assert.equal(url, '/api/admin/activities/create'); }
    send(form) { this.form = form; xhr = this; }
  }
  const limits = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/activityUploadLimits.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, limits);
  const sandbox = { exports: {}, XMLHttpRequest: FakeXHR, require: () => limits.exports };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/uploadActivity.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, sandbox);
  return { upload: sandbox.exports.uploadActivity, xhr: () => xhr };
}

test('reports transfer progress but waits for the server to confirm creation', async () => {
  const app = setup();
  const progress = [];
  let completed = false;
  const result = app.upload(new FormData(), value => progress.push(value)).then(value => { completed = true; return value; });
  app.xhr().upload.onprogress({ lengthComputable: true, loaded: 25, total: 100 });
  app.xhr().upload.onload();
  await Promise.resolve();
  assert.deepEqual(progress, [25, 100]);
  assert.equal(completed, false);
  app.xhr().status = 201;
  app.xhr().responseText = '{"message":"Activity created"}';
  app.xhr().onload();
  assert.equal((await result).ok, true);
});

test('server errors including HTML responses do not become success', async () => {
  for (const body of ['{"message":"Upload failed"}', '<html>Bad gateway</html>']) {
    const app = setup();
    const result = app.upload(new FormData(), () => {});
    app.xhr().status = 502;
    app.xhr().responseText = body;
    app.xhr().onload();
    assert.equal((await result).ok, false);
  }
});

test('network interruption rejects without automatically retrying a possible save', async () => {
  const app = setup();
  const result = app.upload(new FormData(), () => {});
  app.xhr().onerror();
  await assert.rejects(result, /Check the activity list before retrying/);
});

test('proxy HTML 413 errors show the upload limit', async () => {
  const app = setup();
  const result = app.upload(new FormData(), () => {});
  app.xhr().status = 413;
  app.xhr().responseText = '<html>Request Entity Too Large</html>';
  app.xhr().onload();
  const response = await result;
  assert.equal(response.ok, false);
  assert.match(response.message, /100 MB/);
});
