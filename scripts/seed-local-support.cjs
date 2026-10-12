#!/usr/bin/env node
// Local-only sample tickets for reviewing /admin/support. Safe to rerun.
const { loadEnvConfig } = require('@next/env');
const { createHash } = require('node:crypto');
const mongoose = require('mongoose');

loadEnvConfig(require('node:path').resolve(__dirname, '..'));
const uri = process.env.MONGODB_URI;
const target = new URL(uri || 'mongodb://invalid');
if (target.protocol !== 'mongodb:' || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
  throw new Error('This script only seeds a local MongoDB database.');
}
const seed = 'admin-support-demo-v1';
const id = (key) => new mongoose.Types.ObjectId(createHash('sha256').update(`${seed}:${key}`).digest('hex').slice(0, 24));
const samples = [
  ['Meditation missing from Track', 'I marked a meditation as completed today, but it has not appeared in Track. Could you help me check it?', 0],
  ['Restore my subscription', 'I changed phones and would like help restoring my existing subscription.', 0],
  ['Redeem code screen keeps loading', 'The redeem code screen keeps loading before I can enter my code.', 0],
  ['Trouble signing in', 'I cannot sign in after resetting my password. The app shows a sign-in error.', 0],
  ['Audio stops during a meditation', 'The meditation audio stops halfway through when my screen locks.', 0],
  ['Update my email address', 'I would like to update the email address associated with my account.', 0],
  ['Reminder time is incorrect', 'My daily reminder arrives an hour earlier than the time I selected.', 0],
  ['Weekly practice minutes explained', 'Thank you for explaining how the weekly practice minutes are calculated.', 1],
  ['Finding my saved meditations', 'I found my saved meditations after following the instructions. Thank you for your help.', 1],
  ['Suggestion for shorter sessions', 'Could you add more five-minute meditation sessions for quick breaks?', 0],
];

async function main() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;
    const now = new Date();
    const userId = id('user');
    await db.collection('users').updateOne({ _id: userId }, { $setOnInsert: {
      name: 'Sample Support User', email: 'support-demo@example.invalid',
      provider: 'credentials', isVerified: false, isBlocked: true,
      notificationReceive: false, seed, createdAt: now, updatedAt: now,
    } }, { upsert: true });
    const result = await db.collection('supports').bulkWrite(samples.map(([title, message, status], index) => ({
      updateOne: {
        filter: { _id: id(`ticket-${index + 1}`) },
        update: { $setOnInsert: {
          userId, title: `[Sample] ${title}`,
          description: `Sample support request for local testing.\n\n${message}`,
          status, seed, createdAt: new Date(now.getTime() - index * 86400000), updatedAt: now,
        } },
        upsert: true,
      },
    })));
    const rows = await db.collection('supports').aggregate([
      { $match: { seed } },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $project: { _id: 0, title: 1, status: 1, userName: { $arrayElemAt: ['$user.name', 0] } } },
    ]).toArray();
    if (rows.length !== 10 || rows.some(row => row.userName !== 'Sample Support User')) {
      throw new Error('Sample ticket verification failed.');
    }
    console.log(JSON.stringify({ database: db.databaseName, inserted: result.upsertedCount, sampleTickets: rows.length, open: rows.filter(row => row.status === 0).length, resolved: rows.filter(row => row.status === 1).length }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}
main().catch(() => { console.error('Could not seed local support tickets. Check the local MongoDB connection.'); process.exitCode = 1; });
