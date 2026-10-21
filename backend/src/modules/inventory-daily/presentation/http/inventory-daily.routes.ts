import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { inventoryDailyController } from './inventory-daily.controller';
import {
  closeDailySessionSchema,
  openDailySessionSchema,
  recordDailyAdjustmentSchema,
  recordPurchaseSchema,
  recordWastageSchema,
} from './inventory-daily.validators';

const canView = requireAnyPermission('inventory.daily.view', 'inventory.manage', '*');
const canManage = requireAnyPermission('inventory.daily.manage', 'inventory.manage', '*');
const canClose = requireAnyPermission('inventory.daily.close', 'inventory.manage', '*');

export const inventoryDailyRouter = Router();

inventoryDailyRouter.get('/current', requireAuth, canView, inventoryDailyController.getCurrent);
inventoryDailyRouter.get('/dashboard', requireAuth, canView, inventoryDailyController.getDashboard);
inventoryDailyRouter.post(
  '/open',
  requireAuth,
  canManage,
  validateBody(openDailySessionSchema),
  inventoryDailyController.open,
);
inventoryDailyRouter.get('/', requireAuth, canView, inventoryDailyController.list);
inventoryDailyRouter.get('/:id/summary', requireAuth, canView, inventoryDailyController.getSummary);
inventoryDailyRouter.get('/:id/movements', requireAuth, canView, inventoryDailyController.listMovements);
inventoryDailyRouter.post(
  '/:id/close',
  requireAuth,
  canClose,
  validateBody(closeDailySessionSchema),
  inventoryDailyController.close,
);
inventoryDailyRouter.post(
  '/:id/purchases',
  requireAuth,
  canManage,
  validateBody(recordPurchaseSchema),
  inventoryDailyController.recordPurchase,
);
inventoryDailyRouter.post(
  '/:id/wastage',
  requireAuth,
  canManage,
  validateBody(recordWastageSchema),
  inventoryDailyController.recordWastage,
);
inventoryDailyRouter.post(
  '/:id/adjustments',
  requireAuth,
  canManage,
  validateBody(recordDailyAdjustmentSchema),
  inventoryDailyController.recordAdjustment,
);
