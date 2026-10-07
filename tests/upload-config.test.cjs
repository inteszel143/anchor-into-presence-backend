const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('next.config.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
for (const [version, expected, unsupported] of [
  ['15.5.20', 'middlewareClientMaxBodySize', 'proxyClientMaxBodySize'],
  ['16.3.4', 'proxyClientMaxBodySize', 'middlewareClientMaxBodySize'],
]) {
  test(`Next ${version} uses its supported 100 MB upload-buffer setting`, () => {
    const sandbox = { exports: {}, require: name => {
      assert.equal(name, 'next/package.json');
      return { version };
    } };
    vm.runInNewContext(source, sandbox);
    const config = sandbox.exports.default;
    assert.equal(config.experimental[expected], '100mb');
    assert.equal(config.experimental[unsupported], undefined);
  });
}
