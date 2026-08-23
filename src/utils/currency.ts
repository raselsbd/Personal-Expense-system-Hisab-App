export function formatCurrency(amount: number, symbol: string = '৳'): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
  return `${sign}${symbol}${formatted}`;
}
