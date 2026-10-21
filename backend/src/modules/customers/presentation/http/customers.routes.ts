import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
  requirePermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import { customersController } from './customers.controller';
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  loyaltyPointsSchema,
  updateCustomerSchema,
} from './customers.validators';

const canView = requireAnyPermission('customers.manage', 'customers.view');
const canManage = requirePermission('customers.manage');

export const customersRouter = Router();

customersRouter.get(
  '/',
  requireAuth,
  canView,
  validateQuery(listCustomersQuerySchema),
  customersController.list,
);

customersRouter.post(
  '/',
  requireAuth,
  canManage,
  validateBody(createCustomerSchema),
  customersController.create,
);

customersRouter.get('/:id', requireAuth, canView, customersController.getById);

customersRouter.patch(
  '/:id',
  requireAuth,
  canManage,
  validateBody(updateCustomerSchema),
  customersController.update,
);

customersRouter.post(
  '/:id/loyalty/earn',
  requireAuth,
  canManage,
  validateBody(loyaltyPointsSchema),
  customersController.earnPoints,
);

customersRouter.post(
  '/:id/loyalty/redeem',
  requireAuth,
  canManage,
  validateBody(loyaltyPointsSchema),
  customersController.redeemPoints,
);

customersRouter.get(
  '/:id/loyalty/history',
  requireAuth,
  canView,
  customersController.loyaltyHistory,
);
