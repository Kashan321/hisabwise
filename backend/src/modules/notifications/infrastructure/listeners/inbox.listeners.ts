import { prisma } from '../../../../shared/database/prisma-client';
import { eventBus } from '../../../../shared/events/event-bus';
import { logger } from '../../../../shared/logger/logger';
import { runWithTenantContextAsync } from '../../../../shared/tenant-context/tenant-context';
import { createInboxNotificationsForUsers } from '../../application/services/create-inbox-notification.service';
import { resolveNotificationRecipients } from '../../application/services/notify-users.service';
import { formatOrderTicketLabel } from '../../../orders/application/services/order-ticket.service';

function orderLabel(order: {
  ticketPrefix: string | null;
  ticketNumber: number | null;
  id: string;
}) {
  if (order.ticketPrefix != null && order.ticketNumber != null) {
    return formatOrderTicketLabel(order.ticketPrefix, order.ticketNumber);
  }
  return `Order ${order.id.slice(0, 8)}`;
}

const tenantCtx = (businessId: string) => ({
  businessId,
  userId: 'system',
  roles: [] as string[],
  permissions: ['*'],
});

async function notifyOrderAudience(
  businessId: string,
  input: Omit<
    Parameters<typeof createInboxNotificationsForUsers>[1],
    'businessId'
  >,
) {
  const userIds = await resolveNotificationRecipients(businessId, [
    'orders.manage',
    'orders.view',
    'kitchen.manage',
    'orders.create',
    'orders.serve',
  ]);
  if (userIds.length === 0) return;
  await createInboxNotificationsForUsers(userIds, { businessId, ...input });
}

export function registerInboxNotificationListeners() {
  eventBus.on('order.placed', async (payload: { orderId: string; businessId: string }) => {
    try {
      await runWithTenantContextAsync(tenantCtx(payload.businessId), async () => {
        const order = await prisma.order.findFirst({
          where: { id: payload.orderId, businessId: payload.businessId },
          include: { table: true },
        });
        if (!order) {
          logger.warn({ orderId: payload.orderId }, 'order.placed inbox: order not found');
          return;
        }

        const label = orderLabel(order);
        await notifyOrderAudience(payload.businessId, {
          category: 'ORDER',
          title: 'New order',
          body: `${label} was placed${order.table ? ` · Table ${order.table.tableIdentifier}` : ''}.`,
          actionLabel: 'Open order',
          actionHref: `/orders?highlight=${order.id}`,
          metadata: { orderId: order.id },
        });
      });
    } catch (error) {
      logger.error({ err: error, event: 'order.placed' }, 'Inbox notification listener failed');
    }
  });

  eventBus.on(
    'order.status_changed',
    async (payload: { orderId: string; businessId: string; status: string }) => {
      try {
        if (!['RECEIVED', 'PREPARING', 'READY', 'SERVED'].includes(payload.status)) return;

        await runWithTenantContextAsync(tenantCtx(payload.businessId), async () => {
          const order = await prisma.order.findFirst({
            where: { id: payload.orderId, businessId: payload.businessId },
            include: { table: true },
          });
          if (!order) return;

          const label = orderLabel(order);
          const statusLabel = payload.status.replace('_', ' ').toLowerCase();
          await notifyOrderAudience(payload.businessId, {
            category: payload.status === 'READY' ? 'KITCHEN' : 'ORDER',
            title: `Order ${statusLabel}`,
            body: `${label} is now ${statusLabel}${order.table ? ` · Table ${order.table.tableIdentifier}` : ''}.`,
            actionLabel: 'Open order',
            actionHref: `/orders?highlight=${order.id}`,
            metadata: { orderId: order.id, status: payload.status },
          });
        });
      } catch (error) {
        logger.error({ err: error, event: 'order.status_changed' }, 'Inbox notification listener failed');
      }
    },
  );

  eventBus.on('order.items_added', async (payload: { orderId: string; businessId: string }) => {
    try {
      await runWithTenantContextAsync(tenantCtx(payload.businessId), async () => {
        const order = await prisma.order.findFirst({
          where: { id: payload.orderId, businessId: payload.businessId },
        });
        if (!order || order.isDraft) return;

        await notifyOrderAudience(payload.businessId, {
          category: 'ORDER',
          title: 'Items added',
          body: `Items were added to ${orderLabel(order)}.`,
          actionLabel: 'Open order',
          actionHref: `/orders?highlight=${order.id}`,
          metadata: { orderId: order.id },
        });
      });
    } catch (error) {
      logger.error({ err: error, event: 'order.items_added' }, 'Inbox notification listener failed');
    }
  });

  eventBus.on(
    'order.change_request_created',
    async (payload: { orderId: string; businessId: string; requestId: string }) => {
      try {
        await runWithTenantContextAsync(tenantCtx(payload.businessId), async () => {
          const order = await prisma.order.findFirst({
            where: { id: payload.orderId, businessId: payload.businessId },
          });
          if (!order) return;

          const userIds = await resolveNotificationRecipients(payload.businessId, ['orders.manage']);
          await createInboxNotificationsForUsers(userIds, {
            businessId: payload.businessId,
            category: 'ORDER',
            title: 'Order change request',
            body: `A staff member requested changes on ${orderLabel(order)}.`,
            actionLabel: 'Review request',
            actionHref: `/orders?highlight=${order.id}`,
            metadata: { orderId: order.id, requestId: payload.requestId },
          });
        });
      } catch (error) {
        logger.error({ err: error, event: 'order.change_request_created' }, 'Inbox notification listener failed');
      }
    },
  );

  eventBus.on('reservation.created', async (payload: { reservationId: string; businessId: string }) => {
    try {
      await runWithTenantContextAsync(tenantCtx(payload.businessId), async () => {
        const reservation = await prisma.reservation.findFirst({
          where: { id: payload.reservationId, businessId: payload.businessId },
        });
        if (!reservation) return;

        const userIds = await resolveNotificationRecipients(payload.businessId, [
          'reservations.manage',
        ]);
        const when = new Date(reservation.reservationTime).toLocaleString();
        await createInboxNotificationsForUsers(userIds, {
          businessId: payload.businessId,
          category: 'RESERVATION',
          title: 'New reservation',
          body: `${reservation.customerName} · ${when} · party of ${reservation.partySize}.`,
          actionLabel: 'View reservations',
          actionHref: '/reservations',
          metadata: { reservationId: reservation.id },
        });
      });
    } catch (error) {
      logger.error({ err: error, event: 'reservation.created' }, 'Inbox notification listener failed');
    }
  });

  eventBus.on(
    'order.rider_assigned',
    async (payload: { orderId: string; businessId: string; riderId: string }) => {
      try {
        await runWithTenantContextAsync(tenantCtx(payload.businessId), async () => {
          const order = await prisma.order.findFirst({
            where: { id: payload.orderId, businessId: payload.businessId },
          });
          if (!order) return;

          await createInboxNotificationsForUsers([payload.riderId], {
            businessId: payload.businessId,
            category: 'DELIVERY',
            title: 'Delivery assigned',
            body: `You were assigned delivery for ${orderLabel(order)}.`,
            actionLabel: 'Open delivery',
            actionHref: '/rider',
            metadata: { orderId: order.id },
          });
        });
      } catch (error) {
        logger.error({ err: error, event: 'order.rider_assigned' }, 'Inbox notification listener failed');
      }
    },
  );
}
