import { KitchenTicketStatus } from '@prisma/client';
import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { InvalidOrderStatusError, OrderNotFoundError } from '../../../orders/domain/errors/order.errors';
import { prismaKitchenTicketRepository } from '../../infrastructure/persistence/prisma-kitchen-ticket.repository';

const KITCHEN_TICKET_TRANSITIONS: Record<KitchenTicketStatus, KitchenTicketStatus[]> = {
  RECEIVED: ['PREPARING', 'READY', 'CLEARED'],
  PREPARING: ['RECEIVED', 'READY', 'CLEARED'],
  READY: ['RECEIVED', 'PREPARING', 'CLEARED'],
  CLEARED: [],
};

export class UpdateKitchenTicketStatusUseCase {
  async execute(
    businessId: string,
    ticketId: string,
    status: KitchenTicketStatus,
    actorId?: string,
  ) {
    const current = await prismaKitchenTicketRepository.findById(businessId, ticketId);
    if (!current) {
      throw new OrderNotFoundError();
    }

    const ticketStatus = current.status as KitchenTicketStatus;
    const allowed = KITCHEN_TICKET_TRANSITIONS[ticketStatus] ?? [];
    if (!allowed.includes(status)) {
      throw new InvalidOrderStatusError(
        `Cannot transition kitchen ticket from ${current.status} to ${status}`,
      );
    }

    const updated = await prismaKitchenTicketRepository.updateStatus(
      businessId,
      ticketId,
      status,
      actorId,
    );

    emitDomainEvent('order.status_changed', {
      orderId: updated.orderId,
      businessId,
      status: updated.status,
      customerId: updated.customerId,
      totalAmount: updated.totalAmount,
      paymentMethod: updated.paymentMethod,
      paymentStatus: updated.paymentStatus,
    });

    return updated;
  }
}
