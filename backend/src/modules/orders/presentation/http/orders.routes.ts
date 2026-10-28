import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
  requirePermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import {
  deliveryController,
  ordersController,
  riderController,
  waiterController,
} from './orders.controller';
import {
  addOrderItemsSchema,
  adjustOrderItemQuantitySchema,
  assignRiderSchema,
  assignTableWaiterSchema,
  createChangeRequestSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  reviewChangeRequestSchema,
  transferWaiterSchema,
  updateDeliveryStatusSchema,
  updateOrderPricingSchema,
  updateOrderStatusSchema,
} from './orders.validators';

const canViewOrders = requireAnyPermission(
  'orders.view',
  'orders.manage',
  'orders.serve',
  'kitchen.manage',
  'delivery.view',
  'delivery.manage',
);
const canCreateOrders = requireAnyPermission('orders.create', 'orders.serve');
const canManageOrders = requireAnyPermission('orders.manage', 'kitchen.manage');
const canServeOrders = requireAnyPermission('orders.serve', 'orders.manage');
const canManageDelivery = requireAnyPermission('delivery.manage', 'orders.manage');
const canViewDelivery = requireAnyPermission('delivery.view', 'delivery.manage', 'orders.manage');
const canExecuteDelivery = requireAnyPermission('delivery.execute', 'delivery.manage', 'orders.manage');

export const ordersRouter = Router();

ordersRouter.post(
  '/',
  requireAuth,
  canCreateOrders,
  validateBody(createOrderSchema),
  ordersController.create,
);

ordersRouter.get(
  '/',
  requireAuth,
  canViewOrders,
  validateQuery(listOrdersQuerySchema),
  ordersController.list,
);

ordersRouter.get('/filters', requireAuth, canViewOrders, ordersController.filters);

ordersRouter.get('/:id', requireAuth, canViewOrders, ordersController.getById);

ordersRouter.patch(
  '/:id/status',
  requireAuth,
  canManageOrders,
  validateBody(updateOrderStatusSchema),
  ordersController.updateStatus,
);

ordersRouter.post(
  '/:id/items',
  requireAuth,
  canServeOrders,
  validateBody(addOrderItemsSchema),
  ordersController.addItems,
);

ordersRouter.patch(
  '/:id/pricing',
  requireAuth,
  canServeOrders,
  validateBody(updateOrderPricingSchema),
  ordersController.updatePricing,
);

ordersRouter.patch(
  '/:id/items/:itemId',
  requireAuth,
  canServeOrders,
  validateBody(adjustOrderItemQuantitySchema),
  ordersController.adjustOrderItemQuantity,
);

ordersRouter.post(
  '/:id/send-to-kitchen',
  requireAuth,
  canServeOrders,
  ordersController.sendToKitchen,
);

ordersRouter.post(
  '/:id/transfer-waiter',
  requireAuth,
  canManageOrders,
  validateBody(transferWaiterSchema),
  ordersController.transferWaiter,
);

ordersRouter.get(
  '/:id/change-requests',
  requireAuth,
  canViewOrders,
  ordersController.listChangeRequests,
);

ordersRouter.post(
  '/:id/change-requests',
  requireAuth,
  canServeOrders,
  validateBody(createChangeRequestSchema),
  ordersController.createChangeRequest,
);

ordersRouter.patch(
  '/:id/change-requests/:requestId',
  requireAuth,
  canManageOrders,
  validateBody(reviewChangeRequestSchema),
  ordersController.reviewChangeRequest,
);

export const waiterRouter = Router();

waiterRouter.get(
  '/dashboard',
  requireAuth,
  requirePermission('orders.serve'),
  waiterController.dashboard,
);

waiterRouter.get(
  '/orders',
  requireAuth,
  requirePermission('orders.serve'),
  waiterController.listOrders,
);

waiterRouter.post(
  '/tables/:tableId/assign',
  requireAuth,
  requireAnyPermission('orders.manage', 'orders.serve'),
  validateBody(assignTableWaiterSchema),
  waiterController.assignTable,
);

export const deliveryRouter = Router();

deliveryRouter.get(
  '/riders',
  requireAuth,
  canViewDelivery,
  deliveryController.listRiders,
);

deliveryRouter.get(
  '/orders',
  requireAuth,
  canViewDelivery,
  deliveryController.listOrders,
);

deliveryRouter.post(
  '/orders/:id/assign-rider',
  requireAuth,
  canManageDelivery,
  validateBody(assignRiderSchema),
  deliveryController.assignRider,
);

deliveryRouter.patch(
  '/orders/:id/status',
  requireAuth,
  canManageDelivery,
  validateBody(updateDeliveryStatusSchema),
  deliveryController.updateStatus,
);

export const riderRouter = Router();

riderRouter.get(
  '/dashboard',
  requireAuth,
  requirePermission('delivery.execute'),
  riderController.dashboard,
);

riderRouter.get(
  '/deliveries',
  requireAuth,
  requirePermission('delivery.execute'),
  riderController.listDeliveries,
);

riderRouter.get(
  '/cash-pending',
  requireAuth,
  requirePermission('delivery.execute'),
  riderController.listPendingCash,
);

riderRouter.patch(
  '/deliveries/:id/status',
  requireAuth,
  canExecuteDelivery,
  validateBody(updateDeliveryStatusSchema),
  riderController.updateDeliveryStatus,
);
