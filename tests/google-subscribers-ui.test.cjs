const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function render(file, states, props = {}) {
  let index = 0;
  const marker = label => () => React.createElement('span', null, label);
  const appleTypes = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/appleSubscriberTypes.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, appleTypes);
  const modules = {
    '@/lib/appleSubscriberTypes': appleTypes.exports,
    react: { ...React, useEffect: () => {}, useState: initial => [index < states.length ? states[index++] : initial, () => {}] },
    '@/lib/subscriptionPlan': { subscriptionPlan: () => undefined },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'next/image': marker('store icon'),
    'lucide-react': new Proxy({}, { get: () => marker('') }),
    './OfferSkeleton': { OfferMetricSkeleton: marker('Loading metric'), OfferNoticeSkeleton: marker('Loading notice'), OfferTableSkeleton: marker('Loading table') },
    './OfferCustomerCell': marker('customer'),
    './AppleSubscribersReport': marker('Apple subscribers view'),
    './GoogleSubscribersReport': marker('Google subscribers view'),
    './GoogleOffersReport': marker('Google offers view'),
  };
  const context = { exports: {}, require: name => name.endsWith('.css') ? {} : modules[name] };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, context);
  return renderToStaticMarkup(React.createElement(context.exports.default, props));
}
test('Google offers page exposes both reports and defaults to subscribers', () => {
  const file = 'src/app/admin/offers/page.tsx';
  const subscribers = render(file, ['google', 'subscribers']);
  assert.match(subscribers, /Google subscribers view/);
  assert.match(subscribers, /Promotional offers/);
  assert.doesNotMatch(subscribers, /Google offers view/);
  assert.match(render(file, ['google', 'offers']), /Google offers view/);
  assert.match(render(file, ['apple', 'subscribers']), /Apple subscribers view/);
});
test('legacy purchases remain visible without being counted as confirmed subscribers', () => {
  const report = { environment: 'production', checkedAt: 1, checkedPurchases: 0, untrackedPurchases: 1,
    unavailablePurchases: 0, unmatchedItems: 0, totals: { subscribers: 0, active: 0, inactive: 0, needsReview: 0 },
    subscribers: [], recordedPurchases: [{ id: 'legacy', name: 'Legacy member', email: 'legacy@example.test',
      productId: 'founding.annual', orderId: 'GPA.legacy', purchasedAt: 1787346405070 }] };
  const file = 'src/app/admin/offers/GoogleSubscribersReport.tsx';
  const html = render(file, ['production', report, false, '', 0, '', '', 1]);
  for (const text of ['Legacy member', 'legacy@example.test', 'founding.annual', 'GPA.legacy',
    'Not verified with Google', 'Subscription status unknown', 'Verified subscribers', 'Purchases with unknown status']) assert.ok(html.includes(text), text);
  assert.equal((html.match(/<table/g) ?? []).length, 1);
  assert.doesNotMatch(html, /Recorded purchases · Not verified with Google/);
  assert.match(html, /Subscriber list/);
  assert.match(html, /1 of 1 purchases/);
  assert.match(html, /Unknown does not mean inactive/);
  assert.match(render(file, ['production', report, false, '', 0, '', 'review', 1]), /GPA.legacy/);
  assert.match(render(file, ['production', report, false, '', 0, '', 'SUBSCRIPTION_STATE_ACTIVE', 1]), /GPA.legacy/);
  assert.doesNotMatch(render(file, ['production', report, false, '', 0, '', '', 1, 'no-match', 1]), /GPA.legacy/);
  assert.match(render(file, ['production', report, false, '', 0, 'legacy@example.test', '', 1]), /GPA.legacy/);
  assert.match(render(file, ['test', { ...report, environment: 'test' }, false, '', 0, '', '', 1]), /GPA.legacy/);
});
test('subscriber report renders regular subscriptions, coverage, test selection and retry', () => {
  const file = 'src/app/admin/offers/GoogleSubscribersReport.tsx';
  const report = { environment: 'production', checkedAt: 1, checkedPurchases: 1, untrackedPurchases: 2,
    unavailablePurchases: 0, unmatchedItems: 0, totals: { subscribers: 1, active: 1, inactive: 0, needsReview: 0 },
    subscribers: [{ id: 'u', name: 'Test member', email: 'member@example.test', unavailablePurchases: 0, needsReview: false,
      subscriptions: [{ id: 's', productId: 'monthly', state: 'SUBSCRIPTION_STATE_ACTIVE', kind: 'Regular subscription',
        expiresAt: 1800000000000, autoRenewEnabled: true, orderId: 'GPA.test' }] }] };
  const html = render(file, ['production', report, false, '', 0, '', '', 1]);
  for (const text of ['Test member', 'Regular subscription', 'GPA.test', '2 raw saved Android', 'Test purchases', 'Search subscribers']) assert.ok(html.includes(text), text);
  const error = render(file, ['production', null, false, 'Access unavailable', 0, '', '', 1]);
  assert.match(error, /Access unavailable/);
  assert.match(error, /Try again/);
  assert.doesNotMatch(error, /Test member/);
});

test('raw records and deduplicated purchases have explicit units and separate sections', () => {
  const report = { environment: 'production', checkedAt: 1, checkedPurchases: 0, untrackedPurchases: 14,
    unavailablePurchases: 0, unmatchedItems: 0, totals: { subscribers: 0, active: 0, inactive: 0, needsReview: 0 },
    subscribers: [], recordedPurchases: Array.from({ length: 9 }, (_, i) => ({ id: String(i),
      name: 'Unknown member', email: null, productId: 'annual', orderId: `GPA.${i}`, purchasedAt: null })) };
  const html = render('src/app/admin/offers/GoogleSubscribersReport.tsx', ['production', report, false, '', 0, '', '', 1]);
  assert.match(html, /Purchases with unknown status · 9/);
  assert.match(html, /9 purchases after removing duplicate/);
  assert.match(html, /14 raw saved Android purchase records/);
  assert.match(html, /not unique customer counts/);
  assert.match(html, /Restore Purchases/);
  const subscriberSection = html.split('aria-label="Google subscribers"')[1].split('</section>')[0];
  assert.doesNotMatch(subscriberSection, /Unknown member|GPA\./);
  assert.doesNotMatch(html, /Recorded purchases<|Saved without a token;/);
});

test('Apple verification issues show reasons without treating an active account as inactive', () => {
  const report = { environment: 'production', checkedAt: 1, checkedPurchases: 1, untrackedPurchases: 0,
    totals: { subscribers: 1, active: 1, inactive: 0, needsReview: 1 },
    subscribers: [{ id: 'a', name: 'Apple member', email: 'apple@example.test', unavailablePurchases: 1,
      conflict: false, reviewReasons: ['not_found'], subscriptions: [{ originalTransactionId: '100',
        productId: 'annual', status: 'Active', offer: 'Offer code', expiresAt: null, autoRenewEnabled: true }] }] };
  const html = render('src/app/admin/offers/AppleSubscribersReport.tsx', ['production', report, false, '', 0, '', '', 1]);
  for (const text of ['Verified active subscribers', '1 accounts with verification issues', 'Show affected accounts',
    'Purchase not found in the selected environment', 'do not add this count', 'Apple member', 'annual · Active',
    'this result alone does not confirm that']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Accounts needing review|payment failed<|0 purchase records have no usable/);
});

test('Google promotional view shows only offer subscriptions grouped by account', () => {
  const sub = (id, kind) => ({ id, productId: id, state: 'SUBSCRIPTION_STATE_ACTIVE', kind,
    expiresAt: null, autoRenewEnabled: true, orderId: `GPA.${id}` });
  const account = (id, subscriptions) => ({ id, name: id, email: null, subscriptions, unavailablePurchases: 0, needsReview: false });
  const report = { environment: 'production', checkedAt: 1, checkedPurchases: 2, untrackedPurchases: 1,
    unavailablePurchases: 0, unmatchedItems: 0, totals: { subscribers: 2, active: 2, inactive: 0, needsReview: 0 },
    subscribers: [account('Offer member', [sub('promo-plan', 'Custom promo code'), sub('regular-plan', 'Regular subscription')]),
      account('Regular member', [sub('plain-plan', 'Regular subscription')])],
    recordedPurchases: [{ id: 'legacy', name: 'Unverified member' }] };
  const file = 'src/app/admin/offers/GoogleSubscribersReport.tsx';
  const html = render(file, ['production', report, false, '', 0, '', '', 1], { offersOnly: true });
  for (const text of ['Subscribers with promotional offers', 'Offer member', 'promo-plan', '1 accounts', 'Next', 'Refresh']) assert.ok(html.includes(text), text);
  for (const text of ['Regular member', 'regular-plan', 'Unverified member', 'Verified active subscribers', 'Verification details', 'Purchase record details']) assert.ok(!html.includes(text), text);
  assert.equal((html.match(/<table/g) ?? []).length, 1);
  assert.doesNotMatch(render(file, ['production', report, false, '', 0, '', 'SUBSCRIPTION_STATE_EXPIRED', 1], { offersOnly: true }), /Offer member/);
});
