import { pricePerKgFromUnitPrice, type PriceRounding } from '../../../shared/pricing/weight-line-pricing';

export const PRICING_UNIT_GRAMS = [1000, 500, 250, 100] as const;

export type MenuWeightConfigInput = {
  pricingType: 'fixed' | 'by_weight';
  price?: string;
  pricePerUnit?: string;
  pricingUnitG?: number;
  minWeightG?: number | null;
  weightStepG?: number | null;
  quickWeightsG?: number[] | null;
  priceRounding?: number | null;
};

export function normalizePriceRounding(value: number | null | undefined): PriceRounding {
  if (value === 1 || value === 5 || value === 10) return value;
  return null;
}

export function resolveMenuItemPriceFields(input: MenuWeightConfigInput): {
  pricingType: 'FIXED' | 'BY_WEIGHT';
  price: string;
  pricePerKg: string | null;
  pricingUnitG: number | null;
  minWeightG: number | null;
  weightStepG: number | null;
  quickWeightsG: number[] | null;
  priceRounding: number | null;
} {
  if (input.pricingType === 'by_weight') {
    const unitGrams = input.pricingUnitG ?? 1000;
    if (!PRICING_UNIT_GRAMS.includes(unitGrams as (typeof PRICING_UNIT_GRAMS)[number])) {
      throw new Error('Invalid pricing unit');
    }
    const unitPrice = Number(input.pricePerUnit);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error('Price per unit must be greater than zero');
    }
    const pricePerKg = pricePerKgFromUnitPrice(unitPrice, unitGrams);
    return {
      pricingType: 'BY_WEIGHT',
      price: pricePerKg.toFixed(2),
      pricePerKg: pricePerKg.toFixed(2),
      pricingUnitG: unitGrams,
      minWeightG: input.minWeightG ?? null,
      weightStepG: input.weightStepG ?? null,
      quickWeightsG: input.quickWeightsG?.length ? input.quickWeightsG : null,
      priceRounding: input.priceRounding ?? null,
    };
  }

  if (!input.price) {
    throw new Error('Price is required');
  }

  return {
    pricingType: 'FIXED',
    price: input.price,
    pricePerKg: null,
    pricingUnitG: null,
    minWeightG: null,
    weightStepG: null,
    quickWeightsG: null,
    priceRounding: null,
  };
}
