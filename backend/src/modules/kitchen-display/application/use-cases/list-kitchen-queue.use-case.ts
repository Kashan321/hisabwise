import { KitchenTicketStatus } from '@prisma/client';
import { prismaKitchenTicketRepository } from '../../infrastructure/persistence/prisma-kitchen-ticket.repository';

export class ListKitchenQueueUseCase {
  async execute(businessId: string, status?: KitchenTicketStatus) {
    return prismaKitchenTicketRepository.listQueue(businessId, status);
  }
}
