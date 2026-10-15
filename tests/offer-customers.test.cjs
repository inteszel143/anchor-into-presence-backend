const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('customer matches deduplicate restores, flag conflicts, and omit private fields', async () => {
  let filter;
  const purchases = [
    { purchaseId: 'a', userId: '1' }, { purchaseId: 'a', userId: '1' },
    { purchaseId: 'b', userId: '1' }, { purchaseId: 'b', userId: '2' },
    { purchaseId: 'deleted', userId: '3' },
  ];
  const modules = {
    '@/lib/db': { connectDB: async () => {} },
    '@/models/UserPurchase': { UserPurchase: { find: query => { filter = query; return { select: () => ({ lean: async () => purchases }) }; } } },
    '@/models/User': { User: { find: () => ({ select: () => ({ lean: async () => [
      { _id: '1', name: 'Customer', email: 'customer@example.test', password: 'secret' },
      { _id: '2', name: 'Other' },
    ] }) }) } },
  };
  const context = { exports: {}, require: name => modules[name] };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/offerCustomers.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  const matches = await context.exports.findOfferCustomers(['a', 'b', 'deleted', 'missing'], 'ios');
  assert.equal(matches.get('a').status, 'matched');
  assert.equal(matches.get('a').email, 'customer@example.test');
  assert.equal(matches.get('b').status, 'conflict');
  assert.equal(matches.get('b').email, null);
  assert.equal(matches.get('deleted').status, 'unmatched');
  assert.equal(matches.get('missing').status, 'unmatched');
  assert.ok(!JSON.stringify([...matches.values()]).includes('secret'));
  assert.equal(filter.$or[0].platform, 'ios');
  assert.equal((await context.exports.findOfferCustomers([], 'ios')).size, 0);
});
