import { ListKitchenQueueUseCase } from '../application/use-cases/list-kitchen-queue.use-case';
import { ListPickupDisplayUseCase } from '../application/use-cases/list-pickup-display.use-case';
import { UpdateKitchenTicketStatusUseCase } from '../application/use-cases/update-kitchen-ticket-status.use-case';
import { prismaKitchenTicketRepository } from './persistence/prisma-kitchen-ticket.repository';

export const kitchenDisplayModule = {
  listQueue: new ListKitchenQueueUseCase(),
  listPickupDisplay: new ListPickupDisplayUseCase(),
  getTicket: prismaKitchenTicketRepository.findById.bind(prismaKitchenTicketRepository),
  updateTicketStatus: new UpdateKitchenTicketStatusUseCase(),
};
