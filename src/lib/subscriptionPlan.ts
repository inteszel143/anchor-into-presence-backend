// Known catalog IDs take precedence over stale client-supplied plan labels.
export const MONTHLY_PRODUCT_IDS = [
  'com.mindfully.premium.monthly.consumable',
  'com.mindfull.premium.monthly.consumable',
  'com.mindfully.premium.monthly',
  'com.mindfull.premium.monthly',
  'com.mindfull.premium.month',
];
export const YEARLY_PRODUCT_IDS = [
  'com.mindfull.premium.year.consumable',
  'com.mindfull.premium.yearly.consumable',
  'com.mindfull.premium.founding.annual',
  'com.mindfull.premium.year',
  'com.mindfull.premium.yearly',
];
export function subscriptionPlan(productId?: string, recordedPlan?: string) {
  const id = productId?.split(':')[0];
  if (id && MONTHLY_PRODUCT_IDS.includes(id)) return 'monthly';
  if (id && YEARLY_PRODUCT_IDS.includes(id)) return 'yearly';
  return recordedPlan;
}
