import { Router } from 'express';
import { requireAuth, requirePermission } from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { staffController } from './staff.controller';
import {
  createStaffSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
} from './staff.validators';

export const staffRouter = Router();

staffRouter.get('/', requireAuth, requirePermission('staff.manage'), staffController.list);

staffRouter.post(
  '/',
  requireAuth,
  requirePermission('staff.manage'),
  validateBody(createStaffSchema),
  staffController.create,
);

staffRouter.patch(
  '/:id',
  requireAuth,
  requirePermission('staff.manage'),
  validateBody(updateStaffSchema),
  staffController.update,
);

staffRouter.patch(
  '/:id/status',
  requireAuth,
  requirePermission('staff.manage'),
  validateBody(updateStaffStatusSchema),
  staffController.updateStatus,
);

staffRouter.delete(
  '/:id',
  requireAuth,
  requirePermission('staff.manage'),
  staffController.delete,
);
