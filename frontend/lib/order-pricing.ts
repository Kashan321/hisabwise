import type { Promotion } from '@/lib/api/types';
import { formatCurrency } from '@/lib/format-currency';

const DEFAULT_TAX_RATE = 0;
const DEFAULT_SERVICE_RATE = 0;

export const DEFAULT_TAX_RATE_PERCENT = DEFAULT_TAX_RATE * 100;
export const DEFAULT_SERVICE_RATE_PERCENT = DEFAULT_SERVICE_RATE * 100;

export function businessTaxRatePercent(
  business?: { defaultTaxRate?: number | string | null } | null,
): number {
  const rate = Number(business?.defaultTaxRate ?? 0);
  if (!Number.isFinite(rate) || rate < 0) return 0;
  return Math.round(rate * 10000) / 100;
}

export function businessTaxRatePercentLabel(
  business?: { defaultTaxRate?: number | string | null } | null,
): string {
  const percent = businessTaxRatePercent(business);
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(2);
}

/** Resolve order tax from form input; empty input uses the tenant default. */
export function resolveTaxRatePercent(
  taxRatePercentInput: string,
  business?: { defaultTaxRate?: number | string | null } | null,
): number {
  const trimmed = taxRatePercentInput.trim();
  if (trimmed !== '') {
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.min(100, parsed) / 100;
    }
  }
  return businessTaxRatePercent(business) / 100;
}

export function resolveTaxRatePercentLabel(
  taxRatePercentInput: string,
  business?: { defaultTaxRate?: number | string | null } | null,
): string {
  const trimmed = taxRatePercentInput.trim();
  if (trimmed !== '') {
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed >= 0) {
      const clamped = Math.min(100, parsed);
      return Number.isInteger(clamped) ? String(clamped) : clamped.toFixed(2);
    }
  }
  return businessTaxRatePercentLabel(business);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type ManualDiscount = {
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
};

function calculateDiscountAmount(
  subtotal: number,
  type: 'PERCENTAGE' | 'FIXED',
  value: number,
): number {
  if (type === 'PERCENTAGE') {
    return roundMoney(Math.min(subtotal, subtotal * (value / 100)));
  }
  return roundMoney(Math.min(subtotal, value));
}

function promotionDiscount(subtotal: number, promotion: Promotion): number {
  return calculateDiscountAmount(subtotal, promotion.discountType, Number(promotion.discountValue));
}

export function manualDiscountAmount(subtotal: number, discount: ManualDiscount): number {
  return calculateDiscountAmount(subtotal, discount.type, discount.value);
}

export function formatManualDiscountLabel(
  discount: ManualDiscount,
  currency = 'USD',
): string {
  return discount.type === 'PERCENTAGE'
    ? `${discount.value}% off`
    : `${formatCurrency(discount.value, currency)} off`;
}

export function isPromotionApplicable(promotion: Promotion, at = Date.now()): boolean {
  if (!promotion.isActive) return false;
  return (
    at >= new Date(promotion.startDate).getTime() && at <= new Date(promotion.endDate).getTime()
  );
}

export function formatPromotionLabel(promotion: Promotion, currency = 'USD'): string {
  const value = Number(promotion.discountValue);
  const off =
    promotion.discountType === 'PERCENTAGE'
      ? `${value}% off`
      : `${formatCurrency(value, currency)} off`;
  return `${promotion.title} · ${off}`;
}

export function businessDeliveryCharge(
  business?: { defaultDeliveryCharge?: number | string | null } | null,
): number {
  const amount = Number(business?.defaultDeliveryCharge ?? 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return roundMoney(amount);
}

export function estimateOrderTotal(
  subtotal: number,
  promotion?: Promotion | null,
  options?: {
    taxRate?: number;
    serviceRate?: number;
    manualDiscount?: ManualDiscount | null;
    deliveryAmount?: number;
  },
) {
  const taxRate = options?.taxRate ?? DEFAULT_TAX_RATE;
  const serviceRate = options?.serviceRate ?? DEFAULT_SERVICE_RATE;
  const discountAmount = promotion
    ? promotionDiscount(subtotal, promotion)
    : options?.manualDiscount
      ? manualDiscountAmount(subtotal, options.manualDiscount)
      : 0;
  const discountedSubtotal = roundMoney(subtotal - discountAmount);
  const taxAmount = roundMoney(discountedSubtotal * taxRate);
  const serviceAmount = roundMoney(discountedSubtotal * serviceRate);
  const deliveryAmount = roundMoney(options?.deliveryAmount ?? 0);
  const totalAmount = roundMoney(
    discountedSubtotal + taxAmount + serviceAmount + deliveryAmount,
  );

  return { subtotal, discountAmount, taxAmount, serviceAmount, deliveryAmount, totalAmount };
}
