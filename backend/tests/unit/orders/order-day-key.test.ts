import { describe, expect, it } from 'vitest';
import { getOrderDayKey } from '../../../src/shared/date/order-day-key';

describe('getOrderDayKey', () => {
  it('uses the business timezone calendar day', () => {
    const key = getOrderDayKey(new Date('2026-09-14T20:00:00.000Z'), 'Asia/Karachi');
    expect(key).toBe('2026-09-15');
  });

  it('rolls back to the previous day in UTC when still evening in Karachi', () => {
    const key = getOrderDayKey(new Date('2026-09-14T18:00:00.000Z'), 'Asia/Karachi');
    expect(key).toBe('2026-09-14');
  });
});
