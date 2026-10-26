const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function setup({ reduced = false, hasIcon = true } = {}) {
  const links = [];
  function link(href) {
    const attrs = new Map(href ? [['href', href], ['type', 'image/png'], ['sizes', '192x192']] : []);
    return { id: '', attrs, getAttribute: key => attrs.get(key) ?? null, setAttribute: (key, value) => attrs.set(key, value), removeAttribute: key => attrs.delete(key), set href(value) { attrs.set('href', value); }, set type(value) { attrs.set('type', value); } };
  }
  const original = link('/icon.png');
  if (hasIcon) links.push(original);
  let frames = 0, cleared = 0, tick;
  const sandbox = { exports: {}, document: {
    createElement: name => name === 'canvas' ? { getContext: () => ({ clearRect() {}, beginPath() {}, arc() {}, stroke() {} }), toDataURL: () => `data:image/png;base64,frame${++frames}` } : link(),
    getElementById: id => links.find(item => item.id === id) || null,
    querySelectorAll: () => links,
    head: { appendChild(item) { const i = links.indexOf(item); if (i >= 0) links.splice(i, 1); links.push(item); } },
  }, window: {
    matchMedia: () => ({ matches: reduced }),
    setInterval: callback => { tick = callback; return 1; },
    clearInterval: () => { cleared++; tick = undefined; },
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/adminTabIcon.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  return { acquire: sandbox.exports.acquireAdminTabIcon, original, links, link, icon: () => links.find(item => item.id === 'admin-navigation-icon'), tick: () => tick?.(), counts: () => ({ frames, cleared }) };
}

test('overlapping loaders leave framework icons untouched and explicitly restore the app image', () => {
  const s = setup();
  const first = s.acquire(); const second = s.acquire();
  assert.equal(s.original.attrs.get('href'), '/icon.png');
  assert.match(s.icon().attrs.get('href'), /^data:/);
  s.tick(); assert.equal(s.counts().frames, 2);
  first(); first();
  assert.match(s.icon().attrs.get('href'), /^data:/);
  second();
  assert.equal(s.icon().attrs.get('href'), '/icon.png');
  assert.equal(s.icon().attrs.get('sizes'), '192x192');
  assert.equal(s.counts().cleared, 1);
  s.tick(); assert.equal(s.icon().attrs.get('href'), '/icon.png');
  const next = s.acquire(); next();
  assert.equal(s.links.length, 2);
  assert.equal(s.icon().attrs.get('href'), '/icon.png');
});

test('metadata replaced during navigation restores the new route icon', () => {
  const s = setup(); const release = s.acquire();
  s.links.splice(s.links.indexOf(s.original), 1);
  s.links.push(s.link('/icon.png?new-route'));
  release();
  assert.equal(s.icon().attrs.get('href'), '/icon.png?new-route');
  assert.equal(s.links.at(-1), s.icon());
});

test('missing metadata and reduced motion still restore the app icon', () => {
  const s = setup({ reduced: true, hasIcon: false }); const release = s.acquire();
  s.tick(); assert.equal(s.counts().frames, 1);
  release();
  assert.equal(s.icon().attrs.get('href'), '/icon.png');
  assert.equal(s.counts().cleared, 0);
});
