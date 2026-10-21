import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import { businessDayController } from './business-day.controller';
import { listBusinessDaysQuerySchema } from './business-day.validators';

const canManage = requireAnyPermission('business.manage', 'orders.manage', '*');
const canView = requireAnyPermission('reports.view', 'orders.manage', 'business.manage', '*');

export const businessDayRouter = Router();

businessDayRouter.get('/current', requireAuth, canView, businessDayController.getCurrent);
businessDayRouter.post('/open', requireAuth, canManage, businessDayController.open);
businessDayRouter.get(
  '/',
  requireAuth,
  canView,
  validateQuery(listBusinessDaysQuerySchema),
  businessDayController.list,
);
businessDayRouter.get('/:id/summary', requireAuth, canView, businessDayController.getSummary);
businessDayRouter.post('/:id/close', requireAuth, canManage, businessDayController.close);
