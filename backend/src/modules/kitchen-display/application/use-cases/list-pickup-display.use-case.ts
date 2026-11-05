import type { PickupDisplayTicket } from '../../domain/pickup-display.entity';
import { prismaKitchenTicketRepository } from '../../infrastructure/persistence/prisma-kitchen-ticket.repository';

export class ListPickupDisplayUseCase {
  async execute(businessId: string): Promise<PickupDisplayTicket[]> {
    return prismaKitchenTicketRepository.listPickupDisplay(businessId);
  }
}

export type { PickupDisplayTicket, PickupDisplayColumn } from '../../domain/pickup-display.entity';
