export const PASS_PRICING = {
  monthly: { price: 2.99, priceString: '$2.99', interval: 'month', title: 'Monthly', currencyCode: 'USD' },
  annual: { price: 23.99, priceString: '$23.99', interval: 'year', title: 'Annual', currencyCode: 'USD' },
} as const;
export const ANNUAL_SAVINGS_PERCENT = 33;

/** Never advertise one USD price and charge a different amount/currency. */
export function matchesAdvertisedPrice(pkg?: { period: 'monthly' | 'annual'; price: number; currencyCode: string } | null): boolean {
  if (!pkg || !(pkg.period in PASS_PRICING) || !Number.isFinite(pkg.price)) return false;
  const expected = PASS_PRICING[pkg.period];
  return pkg.currencyCode === expected.currencyCode && Math.abs(pkg.price - expected.price) < 0.005;
}
