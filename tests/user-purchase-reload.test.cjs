const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { Mongoose } = require('mongoose');

test('purchase model survives module reloads without changing its collection', () => {
  // Isolated Mongoose registry, with no database connection or writes.
  const mongoose = new Mongoose();
  const source = fs.readFileSync(
    path.join(__dirname, '../src/models/UserPurchase.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  } }).outputText;
  function reload() {
    const sandbox = { exports: {}, require: name => {
      assert.equal(name, 'mongoose');
      return mongoose;
    } };
    vm.runInNewContext(compiled, sandbox);
    return sandbox.exports.UserPurchase;
  }
  const first = reload();
  assert.equal(first.modelName, 'user_purchase');
  const collection = first.collection.name;
  for (let i = 0; i < 3; i++) {
    assert.equal(reload(), first);
    assert.equal(reload().collection.name, collection);
  }
});
