import { KitchenTicketStatus, Prisma } from '@prisma/client';
import { getRawPrismaClient, prisma } from '../../../../shared/database/prisma-client';
import { PRISMA_TRANSACTION_OPTIONS } from '../../../../shared/database/prisma-transaction-options';
import { formatOrderTicketLabel } from '../../../orders/application/services/order-ticket.service';
import { OrderEntity, OrderItemEntity } from '../../../orders/domain/entities/order.entity';
import {
  OrderNotFoundError,
  OrderNotModifiableError,
} from '../../../orders/domain/errors/order.errors';
import { syncOrderStatusFromKitchenTickets } from '../../application/services/kitchen-ticket.service';

const ACTIVE_STATUSES: KitchenTicketStatus[] = ['RECEIVED', 'PREPARING', 'READY'];

const ticketInclude = {
  order: {
    include: {
      table: { select: { tableIdentifier: true } },
      promotion: { select: { title: true } },
      waiter: { select: { name: true } },
      rider: { select: { name: true } },
      createdBy: { select: { name: true } },
      preparedBy: { select: { name: true } },
    },
  },
  preparedBy: { select: { name: true } },
  items: {
    include: {
      modifiers: true,
      menuItem: { select: { imageUrl: true } },
    },
    orderBy: { menuItemName: 'asc' as const },
  },
} as const;

function decimalToString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

function mapTicketItem(item: {
  id: string;
  menuItemId: string | null;
  menuItemName: string;
  variantId: string | null;
  variantName: string | null;
  variantPrice: Prisma.Decimal | null;
  quantity: number;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  customizationNotes: string | null;
  isKitchenAddition: boolean;
  menuItem: { imageUrl: string | null } | null;
  modifiers: Array<{
    id: string;
    modifierOptionId: string | null;
    modifierName: string;
    priceAdjustment: Prisma.Decimal;
  }>;
}): OrderItemEntity {
  return {
    id: item.id,
    menuItemId: item.menuItemId,
    menuItemName: item.menuItemName,
    variantId: item.variantId,
    variantName: item.variantName,
    variantPrice: item.variantPrice ? decimalToString(item.variantPrice) : null,
    imageUrl: item.menuItem?.imageUrl ?? null,
    quantity: item.quantity,
    unitPrice: decimalToString(item.unitPrice),
    lineTotal: decimalToString(item.lineTotal),
    customizationNotes: item.customizationNotes,
    isKitchenAddition: item.isKitchenAddition,
    modifiers: item.modifiers.map((modifier) => ({
      id: modifier.id,
      modifierOptionId: modifier.modifierOptionId,
      modifierName: modifier.modifierName,
      priceAdjustment: decimalToString(modifier.priceAdjustment),
    })),
  };
}

export interface KitchenQueueTicket extends OrderEntity {
  kitchenTicketId: string;
  orderId: string;
  batchNumber: number;
  batchLabel: string | null;
}

function mapKitchenQueueTicket(
  ticket: Prisma.KitchenTicketGetPayload<{ include: typeof ticketInclude }>,
): KitchenQueueTicket {
  const order = ticket.order;
  return {
    id: ticket.id,
    kitchenTicketId: ticket.id,
    orderId: order.id,
    batchNumber: ticket.batchNumber,
    batchLabel: ticket.batchNumber > 1 ? `Add-on ${ticket.batchNumber}` : null,
    businessId: order.businessId,
    tableId: order.tableId,
    tableIdentifier: order.table?.tableIdentifier ?? null,
    customerId: order.customerId,
    promotionId: order.promotionId,
    promotionTitle: order.promotion?.title ?? null,
    createdById: order.createdById,
    createdByName: order.createdBy?.name ?? null,
    waiterId: order.waiterId,
    waiterName: order.waiter?.name ?? null,
    riderId: order.riderId,
    riderName: order.rider?.name ?? null,
    source: order.source,
    orderType: order.orderType,
    status: ticket.status as KitchenQueueTicket['status'],
    deliveryStatus: order.deliveryStatus,
    isDraft: order.isDraft,
    sentToKitchenAt: order.sentToKitchenAt,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: decimalToString(
      ticket.items.reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0)),
    ),
    discountAmount: '0.00',
    taxAmount: '0.00',
    serviceAmount: '0.00',
    deliveryAmount: '0.00',
    totalAmount: decimalToString(
      ticket.items.reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0)),
    ),
    notes: order.notes,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    deliveryNotes: order.deliveryNotes,
    ticketNumber: order.ticketNumber,
    ticketPrefix: order.ticketPrefix,
    businessDayId: order.businessDayId ?? null,
    cashShiftId: order.cashShiftId ?? null,
    ticketLabel:
      order.ticketNumber != null && order.ticketPrefix
        ? `${formatOrderTicketLabel(order.ticketPrefix, order.ticketNumber)}${ticket.batchNumber > 1 ? ` · ${ticket.batchNumber}` : ''}`
        : null,
    preparedById: ticket.preparedById,
    preparedByName: ticket.preparedBy?.name ?? null,
    preparedAt: ticket.preparedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.createdAt,
    items: ticket.items.map(mapTicketItem),
  };
}

export class PrismaKitchenTicketRepository {
  async listQueue(businessId: string, status?: KitchenTicketStatus): Promise<KitchenQueueTicket[]> {
    const statuses = status ? [status] : ACTIVE_STATUSES;
    const tickets = await prisma.kitchenTicket.findMany({
      where: {
        businessId,
        status: { in: statuses },
        order: {
          isDraft: false,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      },
      include: ticketInclude,
      orderBy: { createdAt: 'asc' },
    });
    return tickets.map(mapKitchenQueueTicket);
  }

  async findById(businessId: string, ticketId: string): Promise<KitchenQueueTicket | null> {
    const ticket = await prisma.kitchenTicket.findFirst({
      where: { id: ticketId, businessId },
      include: ticketInclude,
    });
    return ticket ? mapKitchenQueueTicket(ticket) : null;
  }

  async updateStatus(
    businessId: string,
    ticketId: string,
    status: KitchenTicketStatus,
    actorId?: string,
  ): Promise<KitchenQueueTicket> {
    const existing = await prisma.kitchenTicket.findFirst({
      where: { id: ticketId, businessId },
      include: { order: { select: { id: true, isDraft: true, status: true } } },
    });
    if (!existing || existing.order.isDraft) {
      throw new OrderNotFoundError();
    }
    if (existing.order.status === 'COMPLETED' || existing.order.status === 'CANCELLED') {
      throw new OrderNotModifiableError('Cannot update kitchen tickets for a completed or cancelled order');
    }

    const shouldAttributeChef =
      !!actorId && (status === 'PREPARING' || (status === 'READY' && !existing.preparedById));

    const ticket = await getRawPrismaClient().$transaction(async (tx) => {
      const updated = await tx.kitchenTicket.update({
        where: { id: ticketId },
        data: {
          status,
          ...(status === 'CLEARED' ? { clearedAt: new Date() } : {}),
          ...(shouldAttributeChef
            ? { preparedById: actorId, preparedAt: new Date() }
            : {}),
        },
        include: ticketInclude,
      });

      await syncOrderStatusFromKitchenTickets(tx, existing.orderId);
      return updated;
    }, PRISMA_TRANSACTION_OPTIONS);

    return mapKitchenQueueTicket(ticket);
  }
}

export const prismaKitchenTicketRepository = new PrismaKitchenTicketRepository();
