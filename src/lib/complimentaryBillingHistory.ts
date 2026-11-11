/** Present a saved grant in history without inventing a store transaction. */
export function complimentaryBillingRecord(userId: string, user: {
  redemptionYearlyGrantedAt?: Date | string;
  redemptionYearlyExpiresAt?: Date | string;
} | null) {
  if (!user?.redemptionYearlyGrantedAt || !user.redemptionYearlyExpiresAt) return null;
  const start = new Date(user.redemptionYearlyGrantedAt);
  const end = new Date(user.redemptionYearlyExpiresAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null;
  return {
    _id: `complimentary-yearly:${userId}`, userId, purchaseId: '',
    productId: 'complimentary.yearly', planType: 'yearly', amount: 0,
    currencySymbol: '', source: 'complimentary',
    purchaseDate: start, createdAt: start, expiresAt: end,
  };
}
