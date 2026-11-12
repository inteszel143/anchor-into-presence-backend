const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
const mongoose = require('mongoose');
function load(file, modules) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, esModuleInterop: true,
  } }).outputText;
  const context = { exports: {}, require: name => {
    if (!(name in modules)) throw Error(name);
    return modules[name];
  } };
  vm.runInNewContext(compiled, context);
  return context.exports;
}
function fixture({ session = { userId: '507f1f77bcf86cd799439011' }, user = {} } = {}) {
  let writes = 0;
  const modules = {
    '@/lib/subscriptionPlan': load('lib/subscriptionPlan.ts', {}),
    'next/server': { NextResponse },
    '@/lib/db': { connectDB: async () => {} },
    '@/lib/getUserFromRequest': { getUserFromRequest: async () => session },
    '@/lib/apiResponse': { apiErrorResponse: () => { throw Error('Unexpected server failure'); } },
    '@/models/User': { User: {
      updateOne: async (filter, update) => {
        assert.equal(filter._id, session.userId);
        assert.equal(filter.redemptionYearlyExpiresAt, null);
        assert.equal(filter.isBlocked.$ne, true);
        assert.equal(filter.deletionPending.$ne, true);
        if (user && !user.isBlocked && !user.deletionPending && !user.redemptionYearlyExpiresAt) {
          Object.assign(user, update.$set); writes++;
        }
      },
      findById: () => ({ select: () => ({ lean: async () => user }) }),
    } },
  };
  return { modules, user, writes: () => writes,
    route: load('app/api/users/purchase/redemption-fallback/route.ts', modules) };
}

for (const productId of ['com.mindfully.premium.monthly.consumable', 'com.mindfull.premium.monthly.consumable:base-plan', 'com.mindfull.premium.month']) {
  for (const age of [1, 31]) {
    test(`profile uses monthly duration for stale yearly record: ${productId}, age ${age}`, async () => {
      const f = fixture();
      f.modules.mongoose = mongoose;
      f.modules['@/models/UserPurchase'] = { UserPurchase: {
        findOne: () => ({ sort: () => ({ lean: async () => ({
          productId, planType: 'yearly', purchaseDate: new Date(Date.now() - age * 86400000),
        }) }) }),
      } };
      const route = load('app/api/users/profile/route.ts', f.modules);
      const body = await (await route.GET({})).json();
      assert.equal(body.data.subscriptionStatus, age < 30 ? 'active' : 'expired');
      assert.equal(body.data.productId, productId);
    });
  }
}
test('grant uses authenticated account and server dates; concurrent retries do not extend it', async () => {
  const f = fixture();
  const responses = await Promise.all([f.route.POST({}), f.route.POST({}), f.route.POST({})]);
  assert.ok(responses.every(r => r.status === 200));
  assert.equal(f.writes(), 1);
  assert.equal(f.user.redemptionYearlyExpiresAt - f.user.redemptionYearlyGrantedAt, 365 * 86400000);
  assert.equal((await responses[0].json()).data.source, 'complimentary');
});
test('unauthenticated caller cannot grant access', async () => {
  const f = fixture({ session: null });
  assert.equal((await f.route.POST({})).status, 401);
  assert.equal(f.writes(), 0);
});
for (const user of [null, { isBlocked: true }, { deletionPending: true }]) {
  test(`unavailable account cannot grant: ${JSON.stringify(user)}`, async () => {
    const f = fixture({ user });
    assert.equal((await f.route.POST({})).status, 403);
    assert.equal(f.writes(), 0);
  });
}
test('expired grant cannot be renewed by replaying the request', async () => {
  const f = fixture({ user: { redemptionYearlyExpiresAt: new Date(0) } });
  assert.equal((await f.route.POST({})).status, 409);
  assert.equal(f.writes(), 0);
});
for (const active of [true, false]) {
  test(`profile persists complimentary access across app sessions: ${active}`, async () => {
    const f = fixture({ user: { redemptionYearlyExpiresAt: new Date(Date.now() + (active ? 86400000 : -86400000)) } });
    f.modules.mongoose = mongoose;
    f.modules['@/models/UserPurchase'] = { UserPurchase: {
      findOne: () => ({ sort: () => ({ lean: async () => null }) }),
    } };
    const route = load('app/api/users/profile/route.ts', f.modules);
    const body = await (await route.GET({})).json();
    assert.equal(body.data.subscriptionStatus, active ? 'active' : 'not bought');
    assert.equal(body.data.productId, active ? 'complimentary.yearly' : undefined);
  });
}
