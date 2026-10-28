/** Keep in sync with `backend/src/shared/pricing/weight-line-pricing.ts`. */

export const MAX_WEIGHT_G = 20_000;

export type PriceRounding = 1 | 5 | 10 | null;

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function pricePerKgFromUnitPrice(unitPrice: number, pricingUnitGrams: number): number {
  if (pricingUnitGrams <= 0) throw new Error('pricingUnitGrams must be positive');
  return roundMoney(unitPrice * (1000 / pricingUnitGrams));
}

export function applyPriceRounding(amount: number, rounding: PriceRounding): number {
  if (!rounding || rounding <= 0) return roundMoney(amount);
  return Math.round(amount / rounding) * rounding;
}

export function computeWeightLineBase(
  pricePerKg: number,
  weightG: number,
  priceRounding: PriceRounding,
): number {
  const raw = (pricePerKg * weightG) / 1000;
  return applyPriceRounding(raw, priceRounding);
}

export function computeWeightLineTotal(
  pricePerKg: number,
  weightG: number,
  priceRounding: PriceRounding,
  modifierTotalPerUnit: number,
  quantity: number,
): number {
  const base = computeWeightLineBase(pricePerKg, weightG, priceRounding);
  return roundMoney((base + modifierTotalPerUnit) * quantity);
}

export function validateWeightInput(
  weightG: number | undefined | null,
  options: { minWeightG?: number | null; maxWeightG?: number },
):
  | { ok: true; weightG: number }
  | { ok: false; message: string } {
  if (weightG == null || !Number.isFinite(weightG)) {
    return { ok: false, message: 'Enter the weight in grams, e.g. 250' };
  }
  const w = Math.round(weightG);
  if (w <= 0) {
    return { ok: false, message: 'Weight must be greater than zero' };
  }
  const max = options.maxWeightG ?? MAX_WEIGHT_G;
  if (w > max) {
    return { ok: false, message: `Weight cannot exceed ${max / 1000} kg` };
  }
  const min = options.minWeightG ?? 0;
  if (min > 0 && w < min) {
    return { ok: false, message: `Minimum weight is ${formatWeightDisplay(min)}` };
  }
  return { ok: true, weightG: w };
}

export function formatWeightDisplay(weightG: number): string {
  if (weightG >= 1000) {
    const kg = weightG / 1000;
    const text =
      Number.isInteger(kg) ? String(kg) : kg.toFixed(2).replace(/\.?0+$/, '');
    return `${text} kg`;
  }
  return `${weightG} g`;
}

export const PRICING_UNIT_OPTIONS = [
  { label: 'per 1 kg', grams: 1000 },
  { label: 'per 500 g', grams: 500 },
  { label: 'per 250 g', grams: 250 },
  { label: 'per 100 g', grams: 100 },
] as const;

export function pricingUnitLabel(grams: number): string {
  return PRICING_UNIT_OPTIONS.find((o) => o.grams === grams)?.label ?? `per ${grams} g`;
}
