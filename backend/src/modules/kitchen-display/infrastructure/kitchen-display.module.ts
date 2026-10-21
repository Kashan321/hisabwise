import { ListKitchenQueueUseCase } from '../application/use-cases/list-kitchen-queue.use-case';
import { UpdateKitchenTicketStatusUseCase } from '../application/use-cases/update-kitchen-ticket-status.use-case';
import { prismaKitchenTicketRepository } from './persistence/prisma-kitchen-ticket.repository';

export const kitchenDisplayModule = {
  listQueue: new ListKitchenQueueUseCase(),
  getTicket: prismaKitchenTicketRepository.findById.bind(prismaKitchenTicketRepository),
  updateTicketStatus: new UpdateKitchenTicketStatusUseCase(),
};
