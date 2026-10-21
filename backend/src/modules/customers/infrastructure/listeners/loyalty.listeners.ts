import { LOYALTY } from '../../../../config/constants';
import { eventBus } from '../../../../shared/events/event-bus';
import { runWithTenantContext } from '../../../../shared/tenant-context/tenant-context';
import { EarnLoyaltyPointsUseCase } from '../../application/use-cases/earn-loyalty-points.use-case';

export function registerLoyaltyListeners(earnLoyaltyPoints: EarnLoyaltyPointsUseCase) {
  eventBus.on('order.status_changed', async (payload: {
    orderId: string;
    businessId: string;
    status: string;
    customerId?: string | null;
    totalAmount?: string;
  }) => {
    if (payload.status !== 'COMPLETED' || !payload.customerId || !payload.totalAmount) {
      return;
    }

    const points = Math.floor(Number(payload.totalAmount) * LOYALTY.POINTS_PER_DOLLAR);
    if (points <= 0) return;

    await runWithTenantContext(
      {
        businessId: payload.businessId,
        userId: 'system',
        roles: [],
        permissions: ['*'],
      },
      () =>
        earnLoyaltyPoints.execute(payload.businessId, payload.customerId!, {
          points,
          reason: 'Order completed',
          orderId: payload.orderId,
        }),
    );
  });
}
