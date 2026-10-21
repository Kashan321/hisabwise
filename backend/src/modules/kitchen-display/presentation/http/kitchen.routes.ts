import { Router } from 'express';
import { requireAuth, requirePermission } from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import { kitchenController } from './kitchen.controller';
import {
  listKitchenQueueQuerySchema,
  updateKitchenTicketStatusSchema,
} from './kitchen.validators';

export const kitchenRouter = Router();

kitchenRouter.get(
  '/queue',
  requireAuth,
  requirePermission('kitchen.manage'),
  validateQuery(listKitchenQueueQuerySchema),
  kitchenController.listQueue,
);

kitchenRouter.get(
  '/tickets/:id',
  requireAuth,
  requirePermission('kitchen.manage'),
  kitchenController.getTicket,
);

kitchenRouter.patch(
  '/tickets/:id/status',
  requireAuth,
  requirePermission('kitchen.manage'),
  validateBody(updateKitchenTicketStatusSchema),
  kitchenController.updateTicketStatus,
);
