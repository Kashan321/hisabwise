import { Router } from 'express';
import {
  requireAuth,
  requirePermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import { reservationsController } from './reservations.controller';
import {
  availabilityQuerySchema,
  createReservationSchema,
  listReservationsQuerySchema,
  updateReservationSchema,
  updateReservationStatusSchema,
} from './reservations.validators';

const canView = requirePermission('reservations.manage');
const canManage = requirePermission('reservations.manage');

export const reservationsRouter = Router();

reservationsRouter.get(
  '/availability',
  requireAuth,
  canView,
  validateQuery(availabilityQuerySchema),
  reservationsController.getAvailability,
);

reservationsRouter.get(
  '/',
  requireAuth,
  canView,
  validateQuery(listReservationsQuerySchema),
  reservationsController.list,
);

reservationsRouter.post(
  '/',
  requireAuth,
  canManage,
  validateBody(createReservationSchema),
  reservationsController.create,
);

reservationsRouter.get('/:id', requireAuth, canView, reservationsController.getById);

reservationsRouter.patch(
  '/:id',
  requireAuth,
  canManage,
  validateBody(updateReservationSchema),
  reservationsController.update,
);

reservationsRouter.patch(
  '/:id/status',
  requireAuth,
  canManage,
  validateBody(updateReservationStatusSchema),
  reservationsController.updateStatus,
);
