import { Request, Response } from 'express';
import { z } from 'zod';
import { kitchenDisplayModule } from '../../infrastructure/kitchen-display.module';
import { OrderNotFoundError } from '../../../orders/domain/errors/order.errors';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { listKitchenQueueQuerySchema } from './kitchen.validators';

type ListKitchenQueueQuery = z.infer<typeof listKitchenQueueQuerySchema>;

export class KitchenController {
  listQueue = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.validatedQuery as ListKitchenQueueQuery;
    const tickets = await kitchenDisplayModule.listQueue.execute(
      req.tenantContext!.businessId,
      status,
    );
    return success(res, { orders: tickets });
  });

  getTicket = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await kitchenDisplayModule.getTicket(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    if (!ticket) {
      throw new OrderNotFoundError();
    }
    return success(res, { order: ticket });
  });

  updateTicketStatus = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await kitchenDisplayModule.updateTicketStatus.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.status,
      req.tenantContext!.userId,
    );
    return success(res, { order: ticket });
  });
}

export const kitchenController = new KitchenController();
