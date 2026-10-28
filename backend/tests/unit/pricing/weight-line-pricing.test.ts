import {
  computeWeightLineBase,
  computeWeightLineTotal,
  pricePerKgFromUnitPrice,
  validateWeightInput,
} from '../../../src/shared/pricing/weight-line-pricing';

describe('weight-line-pricing', () => {
  it('W-02: 100 g at Rs 2000/kg = Rs 200', () => {
    expect(computeWeightLineBase(2000, 100, null)).toBe(200);
  });

  it('W-03: 350 g at Rs 2000/kg = Rs 700', () => {
    expect(computeWeightLineBase(2000, 350, null)).toBe(700);
  });

  it('W-04: 1250 g at Rs 2000/kg = Rs 2500', () => {
    expect(computeWeightLineBase(2000, 1250, null)).toBe(2500);
  });

  it('W-05: Rs 200 per 100 g equals Rs 2000/kg for 350 g', () => {
    const pricePerKg = pricePerKgFromUnitPrice(200, 100);
    expect(pricePerKg).toBe(2000);
    expect(computeWeightLineBase(pricePerKg, 350, null)).toBe(700);
  });

  it('W-06: rounding nearest 10', () => {
    expect(computeWeightLineBase(1850, 333, 10)).toBe(620);
  });

  it('W-07: rejects invalid weights', () => {
    expect(validateWeightInput(0, {}).ok).toBe(false);
    expect(validateWeightInput(-5, {}).ok).toBe(false);
    expect(validateWeightInput(undefined, {}).ok).toBe(false);
    expect(validateWeightInput(50, { minWeightG: 100 }).ok).toBe(false);
  });

  it('W-15: modifiers add on top before quantity', () => {
    expect(computeWeightLineTotal(2000, 500, null, 0, 1)).toBe(1000);
    const discountedLine = computeWeightLineTotal(2000, 500, null, 0, 1) * 0.9;
    expect(Math.round(discountedLine * 100) / 100).toBe(900);
  });
});
