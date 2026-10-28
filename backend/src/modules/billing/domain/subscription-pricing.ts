export type RenewalDiscountType = 'PERCENT' | 'FIXED';

export type RenewalPricingInput = {
  monthlyPrice: number;
  durationMonths: number;
  discountType?: RenewalDiscountType | null;
  discountValue?: number | null;
  overrideFinalAmount?: number | null;
};

export type RenewalPricingResult = {
  baseAmount: number;
  discountType: RenewalDiscountType | null;
  discountValue: number | null;
  overrideAmount: number | null;
  finalAmount: number;
};

export function resolveTenantMonthlyPrice(
  globalMonthlyPrice: number,
  customMonthlyPrice: number | null | undefined,
): number {
  if (customMonthlyPrice != null && customMonthlyPrice >= 0) {
    return customMonthlyPrice;
  }
  return globalMonthlyPrice;
}

export function calculateRenewalPricing(input: RenewalPricingInput): RenewalPricingResult {
  const baseAmount =
    Math.round(input.monthlyPrice * input.durationMonths * 100) / 100;

  if (input.overrideFinalAmount != null) {
    const finalAmount = Math.round(input.overrideFinalAmount * 100) / 100;
    if (finalAmount < 0) {
      throw new Error('Final amount cannot be negative');
    }
    return {
      baseAmount,
      discountType: null,
      discountValue: null,
      overrideAmount: finalAmount,
      finalAmount,
    };
  }

  let finalAmount = baseAmount;
  let discountType: RenewalDiscountType | null = null;
  let discountValue: number | null = null;

  if (input.discountType && input.discountValue != null && input.discountValue > 0) {
    discountType = input.discountType;
    discountValue = input.discountValue;
    if (discountType === 'PERCENT') {
      if (discountValue > 100) {
        throw new Error('Discount cannot exceed 100%');
      }
      finalAmount = baseAmount * (1 - discountValue / 100);
    } else {
      finalAmount = baseAmount - discountValue;
    }
    finalAmount = Math.round(finalAmount * 100) / 100;
  }

  if (finalAmount < 0) {
    throw new Error('Final amount cannot be negative');
  }

  return {
    baseAmount,
    discountType,
    discountValue,
    overrideAmount: null,
    finalAmount,
  };
}

export function durationMonthsFromBillingInterval(interval: 'MONTHLY' | 'YEARLY' | null | undefined): number {
  if (interval === 'YEARLY') return 12;
  return 1;
}
