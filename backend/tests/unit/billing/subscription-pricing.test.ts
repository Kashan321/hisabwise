import {
  calculateRenewalPricing,
  resolveTenantMonthlyPrice,
} from '../../../src/modules/billing/domain/subscription-pricing';

describe('resolveTenantMonthlyPrice', () => {
  it('uses custom monthly when set', () => {
    expect(resolveTenantMonthlyPrice(5000, 4500)).toBe(4500);
  });

  it('falls back to global monthly', () => {
    expect(resolveTenantMonthlyPrice(5000, null)).toBe(5000);
  });
});

describe('calculateRenewalPricing', () => {
  it('computes base as monthly × months', () => {
    const result = calculateRenewalPricing({ monthlyPrice: 1000, durationMonths: 3 });
    expect(result.baseAmount).toBe(3000);
    expect(result.finalAmount).toBe(3000);
  });

  it('applies percent discount', () => {
    const result = calculateRenewalPricing({
      monthlyPrice: 1000,
      durationMonths: 12,
      discountType: 'PERCENT',
      discountValue: 10,
    });
    expect(result.baseAmount).toBe(12000);
    expect(result.finalAmount).toBe(10800);
  });

  it('uses override final amount', () => {
    const result = calculateRenewalPricing({
      monthlyPrice: 1000,
      durationMonths: 6,
      overrideFinalAmount: 5500,
    });
    expect(result.finalAmount).toBe(5500);
    expect(result.overrideAmount).toBe(5500);
  });
});
