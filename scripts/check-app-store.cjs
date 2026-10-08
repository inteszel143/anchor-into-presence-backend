// Read-only diagnostic. Run from backend: node scripts/check-app-store.cjs
// Optional: --environment production --transaction-id <Apple transaction ID>
// Notification history: --days 180 (production) or --days 30 (sandbox).
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { loadEnvConfig } = require('@next/env');

async function main() {
  const root = path.resolve(__dirname, '..');
  loadEnvConfig(root);
  const { values } = require('node:util').parseArgs({ options: {
    environment: { type: 'string', default: 'sandbox' },
    'transaction-id': { type: 'string' },
    days: { type: 'string', default: '1' },
  } });
  const hosts = {
    sandbox: 'https://api.storekit-sandbox.apple.com',
    production: 'https://api.storekit.apple.com',
  };
  if (!hosts[values.environment]) throw new Error('Environment must be sandbox or production.');
  const days = Number(values.days);
  const maxDays = values.environment === 'sandbox' ? 30 : 180;
  if (!Number.isInteger(days) || days < 1 || days > maxDays) {
    throw new Error(`Days must be an integer between 1 and ${maxDays}.`);
  }
  for (const name of ['APPLE_ISSUER_ID', 'APPLE_KEY_ID', 'APPLE_BUNDLE_ID', 'APPLE_PRIVATE_KEY_PATH']) {
    if (!process.env[name]) throw new Error(`Missing ${name}`);
  }
  const transactionId = values['transaction-id'];
  if (transactionId && !/^\d+$/.test(transactionId)) throw new Error('Expected a numeric Apple transaction ID.');
  const key = fs.readFileSync(path.resolve(root, process.env.APPLE_PRIVATE_KEY_PATH), 'utf8');
  const token = jwt.sign({ bid: process.env.APPLE_BUNDLE_ID }, key, {
    algorithm: 'ES256', keyid: process.env.APPLE_KEY_ID,
    issuer: process.env.APPLE_ISSUER_ID, audience: 'appstoreconnect-v1', expiresIn: '5m',
    header: { typ: 'JWT' },
  });
  const endDate = Date.now();
  const requestBody = transactionId ? undefined : { startDate: endDate - days * 86400000 + 60000, endDate };
  const endpoint = transactionId
    ? `/inApps/v1/transactions/${transactionId}`
    : '/inApps/v1/notifications/history';
  const response = await fetch(hosts[values.environment] + endpoint, {
    method: transactionId ? 'GET' : 'POST', redirect: 'error',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: requestBody ? JSON.stringify(requestBody) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const raw = await response.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = raw; }
  const result = {
    checkedAt: new Date().toISOString(), environment: values.environment,
    bundleId: process.env.APPLE_BUNDLE_ID, endpoint, requestBody,
    httpStatus: response.status, body,
  };
  // Keep potentially sensitive purchase data in the ignored local folder.
  const directory = path.join(root, '.secrets');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const output = path.join(directory, `app-store-${values.environment}-response.json`);
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(result, null, 2));
  console.log(`Response saved to ${output}`);
  if (!response.ok) process.exitCode = 1;
}

main().catch(error => {
  // Never print the signing key, bearer token, or request headers.
  console.error(`App Store check failed: ${error.message}`);
  process.exitCode = 1;
});
