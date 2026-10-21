import { DEFAULT_CURRENCY } from './currencies';

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = DEFAULT_CURRENCY,
): string {
  const value = Number(amount ?? 0);
  const code = currency || DEFAULT_CURRENCY;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: code === 'JPY' ? 0 : 2,
      maximumFractionDigits: code === 'JPY' ? 0 : 2,
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}
