import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
  requirePermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { suppliersController } from './suppliers.controller';
import {
  createSupplierSchema,
  recordSupplierPaymentSchema,
  updateSupplierSchema,
} from './suppliers.validators';

const canView = requireAnyPermission('inventory.view', 'inventory.manage', '*');
const canManage = requirePermission('inventory.manage');

export const suppliersRouter = Router();

suppliersRouter.get('/', requireAuth, canView, suppliersController.list);
suppliersRouter.post(
  '/',
  requireAuth,
  canManage,
  validateBody(createSupplierSchema),
  suppliersController.create,
);
suppliersRouter.get('/:id', requireAuth, canView, suppliersController.get);
suppliersRouter.get('/:id/ledger', requireAuth, canView, suppliersController.getLedger);
suppliersRouter.patch(
  '/:id',
  requireAuth,
  canManage,
  validateBody(updateSupplierSchema),
  suppliersController.update,
);
suppliersRouter.post(
  '/:id/payments',
  requireAuth,
  canManage,
  validateBody(recordSupplierPaymentSchema),
  suppliersController.recordPayment,
);
