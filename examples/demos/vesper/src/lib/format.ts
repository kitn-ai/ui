const FORMAT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** Prices are whole dollars throughout the catalog; keep them that way. */
export const money = (amount: number) => FORMAT.format(amount);
