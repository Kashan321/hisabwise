import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
  requirePermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import { inventoryController } from './inventory.controller';
import { inventoryDailyRouter } from '../../../inventory-daily/presentation/http/inventory-daily.routes';
import { suppliersRouter } from '../../../suppliers/presentation/http/suppliers.routes';
import {
  adjustStockSchema,
  createInventoryItemSchema,
  listMovementsQuerySchema,
  receiveStockSchema,
  updateInventoryItemSchema,
} from './inventory.validators';

const canView = requireAnyPermission(
  'inventory.view',
  'inventory.manage',
  'menu.manage',
  'orders.view',
  'orders.create',
  'orders.serve',
);
const canManage = requirePermission('inventory.manage');

export const inventoryRouter = Router();

inventoryRouter.use('/daily', inventoryDailyRouter);
inventoryRouter.use('/suppliers', suppliersRouter);

inventoryRouter.get('/items', requireAuth, canView, inventoryController.listItems);
inventoryRouter.post(
  '/items',
  requireAuth,
  canManage,
  validateBody(createInventoryItemSchema),
  inventoryController.createItem,
);
inventoryRouter.get('/items/:id', requireAuth, canView, inventoryController.getItem);
inventoryRouter.patch(
  '/items/:id',
  requireAuth,
  canManage,
  validateBody(updateInventoryItemSchema),
  inventoryController.updateItem,
);
inventoryRouter.post(
  '/items/:id/receive',
  requireAuth,
  canManage,
  validateBody(receiveStockSchema),
  inventoryController.receiveStock,
);
inventoryRouter.post(
  '/items/:id/adjust',
  requireAuth,
  canManage,
  validateBody(adjustStockSchema),
  inventoryController.adjustStock,
);
inventoryRouter.get(
  '/movements',
  requireAuth,
  canView,
  validateQuery(listMovementsQuerySchema),
  inventoryController.listMovements,
);
inventoryRouter.get('/availability', requireAuth, canView, inventoryController.getAvailability);
