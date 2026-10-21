import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import { cashShiftController } from './cash-shift.controller';
import {
  cashDrawerMovementSchema,
  closeCashShiftSchema,
  confirmRiderCashHandoffSchema,
  listCashShiftsQuerySchema,
  openCashShiftSchema,
} from './cash-shift.validators';

const canManage = requireAnyPermission('cash.shift', 'orders.manage', '*');
const canView = requireAnyPermission('cash.shift', 'orders.manage', 'orders.view', '*');

export const cashShiftRouter = Router();

cashShiftRouter.get('/current', requireAuth, canView, cashShiftController.getCurrent);
cashShiftRouter.get(
  '/settlement-accounts',
  requireAuth,
  canView,
  cashShiftController.listSettlementAccounts,
);
cashShiftRouter.get(
  '/rider-handoffs/pending',
  requireAuth,
  canManage,
  cashShiftController.listPendingRiderHandoffs,
);
cashShiftRouter.post(
  '/rider-handoffs/confirm',
  requireAuth,
  canManage,
  validateBody(confirmRiderCashHandoffSchema),
  cashShiftController.confirmRiderCashHandoff,
);
cashShiftRouter.get(
  '/',
  requireAuth,
  canView,
  validateQuery(listCashShiftsQuerySchema),
  cashShiftController.list,
);
cashShiftRouter.get('/:id/summary', requireAuth, canView, cashShiftController.getSummary);
cashShiftRouter.post(
  '/open',
  requireAuth,
  canManage,
  validateBody(openCashShiftSchema),
  cashShiftController.open,
);
cashShiftRouter.post(
  '/:id/close',
  requireAuth,
  canManage,
  validateBody(closeCashShiftSchema),
  cashShiftController.close,
);
cashShiftRouter.post(
  '/:id/movements',
  requireAuth,
  canManage,
  validateBody(cashDrawerMovementSchema),
  cashShiftController.addMovement,
);
