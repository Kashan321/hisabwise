import { KitchenTicketStatus, Prisma } from '@prisma/client';
import type { OrderStatus } from '../../../orders/domain/entities/order.entity';

const ACTIVE_KITCHEN_TICKET_STATUSES: KitchenTicketStatus[] = ['RECEIVED', 'PREPARING', 'READY'];

type Tx = Prisma.TransactionClient;

export async function nextKitchenBatchNumber(tx: Tx, orderId: string): Promise<number> {
  const last = await tx.kitchenTicket.findFirst({
    where: { orderId },
    orderBy: { batchNumber: 'desc' },
    select: { batchNumber: true },
  });
  return (last?.batchNumber ?? 0) + 1;
}

export async function createKitchenTicket(
  tx: Tx,
  input: {
    businessId: string;
    orderId: string;
    itemIds: string[];
    status?: KitchenTicketStatus;
  },
): Promise<string> {
  const batchNumber = await nextKitchenBatchNumber(tx, input.orderId);
  const ticket = await tx.kitchenTicket.create({
    data: {
      businessId: input.businessId,
      orderId: input.orderId,
      batchNumber,
      status: input.status ?? 'RECEIVED',
    },
  });

  if (input.itemIds.length > 0) {
    await tx.orderItem.updateMany({
      where: { id: { in: input.itemIds }, orderId: input.orderId },
      data: { kitchenTicketId: ticket.id },
    });
  }

  return ticket.id;
}

export async function assignNewItemsToKitchenTicket(
  tx: Tx,
  input: {
    businessId: string;
    orderId: string;
    orderStatus: OrderStatus;
    itemIds: string[];
  },
): Promise<string> {
  const activeTickets = await tx.kitchenTicket.findMany({
    where: {
      orderId: input.orderId,
      status: { in: ACTIVE_KITCHEN_TICKET_STATUSES },
    },
    orderBy: { batchNumber: 'asc' },
  });

  const openReceivedTicket = activeTickets.find((ticket) => ticket.status === 'RECEIVED');
  const canAppendToOpenTicket =
    input.orderStatus === 'RECEIVED' &&
    activeTickets.length === 1 &&
    openReceivedTicket !== undefined;

  if (canAppendToOpenTicket && openReceivedTicket) {
    await tx.orderItem.updateMany({
      where: { id: { in: input.itemIds }, orderId: input.orderId },
      data: { kitchenTicketId: openReceivedTicket.id },
    });
    return openReceivedTicket.id;
  }

  return createKitchenTicket(tx, {
    businessId: input.businessId,
    orderId: input.orderId,
    itemIds: input.itemIds,
    status: 'RECEIVED',
  });
}

export async function ensureKitchenTicketForOrder(
  tx: Tx,
  businessId: string,
  orderId: string,
): Promise<string> {
  const existing = await tx.kitchenTicket.findFirst({
    where: { orderId },
    orderBy: { batchNumber: 'asc' },
    select: { id: true },
  });
  if (existing) return existing.id;

  const itemIds = (
    await tx.orderItem.findMany({
      where: { orderId },
      select: { id: true },
    })
  ).map((item) => item.id);

  return createKitchenTicket(tx, {
    businessId,
    orderId,
    itemIds,
    status: 'RECEIVED',
  });
}

export async function clearActiveKitchenTicketsForOrder(
  tx: {
    kitchenTicket: {
      updateMany: (args: {
        where: { orderId: string; status: { in: KitchenTicketStatus[] } };
        data: { status: KitchenTicketStatus; clearedAt: Date };
      }) => Promise<unknown>;
    };
  },
  orderId: string,
): Promise<void> {
  await tx.kitchenTicket.updateMany({
    where: {
      orderId,
      status: { in: ACTIVE_KITCHEN_TICKET_STATUSES },
    },
    data: {
      status: 'CLEARED',
      clearedAt: new Date(),
    },
  });
}

export async function syncOrderStatusFromKitchenTickets(tx: Tx, orderId: string): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!order || order.status === 'COMPLETED' || order.status === 'CANCELLED') {
    return;
  }

  const tickets = await tx.kitchenTicket.findMany({
    where: {
      orderId,
      status: { in: ACTIVE_KITCHEN_TICKET_STATUSES },
    },
    select: { status: true },
  });

  if (tickets.length === 0) {
    return;
  }

  const statuses = tickets.map((ticket) => ticket.status);
  let orderStatus: OrderStatus = 'RECEIVED';
  if (statuses.every((status) => status === 'READY')) {
    orderStatus = 'READY';
  } else if (statuses.some((status) => status === 'PREPARING' || status === 'READY')) {
    orderStatus = 'PREPARING';
  }

  await tx.order.update({
    where: { id: orderId },
    data: { status: orderStatus },
  });
}
