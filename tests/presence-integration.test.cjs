const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const mongoose = require('mongoose');
const { NextRequest } = require('next/server');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', code)(name => name in mocks ? mocks[name] : require(name), exports);
  return exports;
}
// Explicit opt-in; fixed isolated localhost database, never the application URI.
test('MongoDB session presence: concurrent devices, ordering, expiry and legacy clients', { skip: !process.env.RUN_PRESENCE_INTEGRATION }, async () => {
  await mongoose.connect('mongodb://127.0.0.1:27229/aip_presence_test');
  const { User } = load('src/models/User.ts');
  const presence = load('src/lib/appPresence.ts');
  const updates = load('src/lib/presenceUpdate.ts', { './appPresence': presence });
  const user = await User.create({ email: `presence-${Date.now()}@example.test` });
  let published = 0;
  const route = load('src/app/api/users/presence/route.ts', {
    '@/lib/db': { connectDB: async () => {} }, '@/models/User': { User },
    '@/lib/appPresence': presence, '@/lib/presenceUpdate': updates,
    '@/lib/getUserFromRequest': { getUserFromRequest: async () => ({ role: 'user', userId: String(user._id) }) },
    '@/lib/apiResponse': { apiErrorResponse: error => { throw error; } },
    '@/lib/presenceEvents': { publishPresenceChange: async () => { published++; } },
  });
  const send = body => route.POST(new NextRequest('http://localhost/api/users/presence', {
    method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
  const signal = (device, sequence, active) => ({ sessionId: device.repeat(16), sequence, active });
  const current = () => User.findById(user._id).select('+presenceSessions').lean();
  try {
    const originalUpdatedAt = +user.updatedAt;
    const opened = await Promise.all([send(signal('a', 1, true)), send(signal('b', 1, true))]);
    assert.ok(opened.every(r => r.status === 200));
    let record = await current();
    assert.equal(record.presenceSessions.length, 2);
    assert.ok(+record.presenceUntil > Date.now());
    assert.equal(+record.updatedAt, originalUpdatedAt);
    await send(signal('a', 2, false));
    assert.ok(+(await current()).presenceUntil > Date.now(), 'second device keeps user active');
    await send(signal('b', 2, false));
    record = await current();
    assert.equal(+record.presenceUntil, 0, 'last device leaving ends presence immediately');
    const eventsBeforeReplay = published;
    assert.equal((await (await send(signal('a', 1, true))).json()).ignored, true);
    assert.equal(published, eventsBeforeReplay);
    assert.equal(+record.lastSeenAt, +(await current()).lastSeenAt);
    await send(signal('a', 4, true));
    await send(signal('a', 3, false));
    record = await current();
    assert.ok(+record.presenceUntil > Date.now(), 'delayed leave cannot undo resume');
    assert.equal(presence.appPresence(record.lastSeenAt.toISOString(), +record.presenceUntil, false, record.presenceUntil.toISOString()).active, false);
    await send(); // Older app on another device remains supported.
    await send(signal('a', 5, false));
    assert.ok(+(await current()).presenceUntil > Date.now(), 'legacy device is still active');
    for (const body of [{}, signal('x', -1, true), { ...signal('x', 1, true), active: 'true' }]) {
      assert.equal((await send(body)).status, 400);
    }
    const safe = updates.parsePresenceSignal({ ...signal('c', 1, true), userId: '$password', lastSeenAt: '2099-01-01' });
    assert.deepEqual(Object.keys(safe).sort(), ['active', 'sequence', 'sessionId']);
  } finally {
    await User.deleteOne({ _id: user._id });
    await mongoose.disconnect();
  }
});
