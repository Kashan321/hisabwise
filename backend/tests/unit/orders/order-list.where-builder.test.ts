import { buildOrderListWhere } from '../../../src/modules/orders/infrastructure/persistence/order-list.where-builder';

describe('buildOrderListWhere', () => {
  const businessId = '00000000-0000-4000-8000-000000000001';

  it('filters by business day ids with legacy createdAt fallback', () => {
    const where = buildOrderListWhere(businessId, {
      dateFrom: '2026-09-24',
      dateTo: '2026-09-24',
      businessDayIds: ['00000000-0000-4000-8000-000000000010'],
    });

    expect(where).toMatchObject({
      businessId,
      OR: [
        { businessDayId: { in: ['00000000-0000-4000-8000-000000000010'] } },
        {
          businessDayId: null,
          createdAt: {
            gte: new Date(2026, 8, 24, 0, 0, 0, 0),
            lte: new Date(2026, 8, 24, 23, 59, 59, 999),
          },
        },
      ],
    });
  });

  it('filters by cash shift id', () => {
    const shiftId = '00000000-0000-4000-8000-000000000020';
    const where = buildOrderListWhere(businessId, { cashShiftId: shiftId });

    expect(where).toMatchObject({
      businessId,
      cashShiftId: shiftId,
    });
  });
});
