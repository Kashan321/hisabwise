export function formatItemProfit(
  salePrice: string | number,
  basePrice: string | number | null | undefined,
) {
  if (basePrice == null || basePrice === '') return null;
  const sale = Number(salePrice);
  const cost = Number(basePrice);
  if (!Number.isFinite(sale) || !Number.isFinite(cost)) return null;
  const profit = Math.round((sale - cost) * 100) / 100;
  const margin = sale > 0 ? Math.round((profit / sale) * 1000) / 10 : 0;
  return { profit, margin };
}
