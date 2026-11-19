const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function render(file, states) {
  let index = 0;
  const marker = label => () => React.createElement('span', null, label);
  const modules = {
    react: { ...React, useEffect: () => {}, useState: initial => [index < states.length ? states[index++] : initial, () => {}] },
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
  return renderToStaticMarkup(React.createElement(context.exports.default));
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
test('subscriber report renders regular subscriptions, coverage, test selection and retry', () => {
  const file = 'src/app/admin/offers/GoogleSubscribersReport.tsx';
  const report = { environment: 'production', checkedAt: 1, checkedPurchases: 1, untrackedPurchases: 2,
    unavailablePurchases: 0, unmatchedItems: 0, totals: { subscribers: 1, active: 1, inactive: 0, needsReview: 0 },
    subscribers: [{ id: 'u', name: 'Test member', email: 'member@example.test', unavailablePurchases: 0, needsReview: false,
      subscriptions: [{ id: 's', productId: 'monthly', state: 'SUBSCRIPTION_STATE_ACTIVE', kind: 'Regular subscription',
        expiresAt: 1800000000000, autoRenewEnabled: true, orderId: 'GPA.test' }] }] };
  const html = render(file, ['production', report, false, '', 0, '', '', 1]);
  for (const text of ['Test member', 'Regular subscription', 'GPA.test', '2 saved Android', 'Test purchases', 'Search subscribers']) assert.ok(html.includes(text), text);
  const error = render(file, ['production', null, false, 'Access unavailable', 0, '', '', 1]);
  assert.match(error, /Access unavailable/);
  assert.match(error, /Try again/);
  assert.doesNotMatch(error, /Test member/);
});
