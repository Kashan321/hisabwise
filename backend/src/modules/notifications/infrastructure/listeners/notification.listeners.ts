import { prisma } from '../../../../shared/database/prisma-client';
import { eventBus } from '../../../../shared/events/event-bus';
import { runWithTenantContext } from '../../../../shared/tenant-context/tenant-context';

export function registerNotificationListeners() {
  eventBus.on('reservation.created', async (payload: { reservationId: string; businessId: string }) => {
    await runWithTenantContext(
      { businessId: payload.businessId, userId: 'system', roles: [], permissions: ['*'] },
      async () => {
        const reservation = await prisma.reservation.findFirst({
          where: { id: payload.reservationId, businessId: payload.businessId },
        });
        if (!reservation?.customerContact) return;

        const channel = reservation.customerContact.includes('@') ? 'EMAIL' : 'SMS';
        await prisma.notificationLog.create({
          data: {
            businessId: payload.businessId,
            channel,
            recipient: reservation.customerContact,
            template: 'reservation_created',
            status: 'SENT',
            sentAt: new Date(),
            payload: { reservationId: payload.reservationId },
          },
        });
      },
    );
  });
}
