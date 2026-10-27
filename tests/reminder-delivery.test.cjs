const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  new Function('require', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    throw new Error(`Unexpected import: ${name}`);
  }, exports);
  return exports;
}
const helper = load('src/lib/helperMethods.ts', {});
test('daily 8 AM Manila reminder runs at midnight UTC and reads the latest device token', async () => {
  let options, expression, callback;
  let user = { fcmToken: 'fresh-token', notificationReceive: true };
  const sent = [];
  const saved = [];
  const registry = new Map();
  const { scheduleReminder } = load('src/cron/scheduleReminder.ts', {
    'node-cron': { schedule: (e, cb, opts) => { expression = e; callback = cb; options = opts; return { stop() {} }; } },
    './cronRegistry': { cronJobRegistry: registry },
    '../models/ScheduledCronJob': { ScheduledCronJob: { findOne: async () => null, create: async value => saved.push(value) } },
    '../lib/sendNotificationToUser': { sendNotificationToUser: async (...args) => sent.push(args) },
    '../lib/helperMethods': helper,
    '@/models/User': { User: { findById: async () => user } },
  });
  const reminder = { _id: 'reminder', userId: 'user', time: '00:00', weekday: [0, 1, 2, 3, 4, 5, 6] };
  await scheduleReminder(reminder); // No push token is needed to schedule.
  assert.equal(expression, '0 0 * * 0,1,2,3,4,5,6');
  assert.equal(options.timezone, 'UTC');
  assert.equal(saved.length, 1);
  await callback();
  assert.equal(sent[0][0], 'fresh-token');
  user = { fcmToken: 'rotated-token', notificationReceive: true };
  await callback();
  assert.equal(sent[1][0], 'rotated-token');
  user.isBlocked = true;
  await callback();
  user = { notificationReceive: true };
  await callback();
  assert.equal(sent.length, 2);
  await scheduleReminder(reminder);
  assert.equal(saved.length, 1); // Do not duplicate a restored live task.
});
test('startup recovers recurring reminders even when there is no saved cron job', async () => {
  const scheduled = [];
  const reminder = { _id: 'orphan', time: '00:00', weekday: [0,1,2,3,4,5,6] };
  const { restoreCronJobs } = load('src/cron/restoreCronJobs.ts', {
    '@/models/UserScheduleNotification': { UserScheduleNotification: { find: async () => [reminder] } },
    '@/models/ScheduledCronJob': { ScheduledCronJob: {} },
    './scheduleReminder': { scheduleReminder: async value => scheduled.push(value) },
  });
  await restoreCronJobs();
  assert.deepEqual(scheduled, [reminder]);
});
test('push token registration rejects unauthenticated calls and updates only the signed-in user', async () => {
  let identity = null;
  const updates = [], scheduled = [];
  const { PATCH } = load('src/app/api/users/push-token/route.ts', {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    '@/lib/db': { connectDB: async () => {} },
    '@/lib/getUserFromRequest': { getUserFromRequest: async () => identity },
    '@/models/User': { User: { findOneAndUpdate: async (filter, update) => { updates.push({filter, update}); return {}; } } },
    '@/models/UserScheduleNotification': { UserScheduleNotification: { find: async filter => { assert.equal(filter.userId, 'signed-in-user'); return [{ _id: 'reminder' }]; } } },
    '@/cron/scheduleReminder': { scheduleReminder: async reminder => scheduled.push(reminder) },
  });
  const req = body => ({ json: async () => body });
  assert.equal((await PATCH(req({ fcmToken: 'token' }))).status, 401);
  identity = { role: 'user', userId: 'signed-in-user' };
  assert.equal((await PATCH(req({ fcmToken: '' }))).status, 400);
  assert.equal(updates.length, 0);
  assert.equal((await PATCH(req({ fcmToken: 'new-token', userId: 'someone-else' }))).status, 200);
  assert.equal(updates[0].filter._id, 'signed-in-user');
  assert.equal(updates[0].update.$set.fcmToken, 'new-token');
  assert.equal(scheduled.length, 1);
});
