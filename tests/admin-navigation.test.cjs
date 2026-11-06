const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file, mocks) {
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  new Function('require', 'module', 'exports', outputText)(
    name => name in mocks ? mocks[name] : require(name), module, module.exports,
  );
  return module.exports.default;
}

test('programmatic admin navigation uses the client router and preserves history/scroll options', () => {
  const calls = [];
  const Provider = load('src/components/AdminNavigationProvider.tsx', {
    'next/navigation': { useRouter: () => ({
      push: (...args) => calls.push(['push', ...args]),
      replace: (...args) => calls.push(['replace', ...args]),
    }) },
  });
  const tree = Provider({ children: 'page' });
  tree.props.value('/admin/app-version', {});
  tree.props.value('/admin/users?page=2', { replace: true, scroll: false });
  assert.deepEqual(calls, [
    ['push', '/admin/app-version', { scroll: undefined }],
    ['replace', '/admin/users?page=2', { scroll: false }],
  ]);
  assert.equal(tree.props.children, 'page');
});

test('admin links delegate navigation and cancellation to Next Link', () => {
  const Link = () => null;
  const AdminLink = load('src/components/AdminLink.tsx', { 'next/link': Link });
  const onNavigate = event => event.preventDefault();
  const ref = { current: null };
  const tree = AdminLink({ href: '/admin/app-version', onNavigate, ref, scroll: false, children: 'App versions' });
  assert.equal(tree.type, Link);
  assert.equal(tree.props.href, '/admin/app-version');
  assert.equal(tree.props.onNavigate, onNavigate);
  assert.equal(tree.props.ref, ref);
  assert.equal(tree.props.scroll, false);
  assert.equal(tree.props.prefetch, false);
});
