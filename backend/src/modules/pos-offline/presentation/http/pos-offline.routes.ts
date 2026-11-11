import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { posOfflineController } from './pos-offline.controller';
import {
  registerPosDeviceSchema,
  syncOfflineOrdersBatchSchema,
} from './pos-offline.validators';

const canUsePos = requireAnyPermission(
  'orders.create',
  'orders.serve',
  'orders.manage',
  'orders.view',
);

export const posOfflineRouter = Router();

posOfflineRouter.post(
  '/devices/register',
  requireAuth,
  canUsePos,
  validateBody(registerPosDeviceSchema),
  posOfflineController.registerDevice,
);

posOfflineRouter.get(
  '/offline-snapshot',
  requireAuth,
  canUsePos,
  posOfflineController.getSnapshot,
);

posOfflineRouter.post(
  '/orders/sync-batch',
  requireAuth,
  requireAnyPermission('orders.create', 'orders.serve', 'orders.manage'),
  validateBody(syncOfflineOrdersBatchSchema),
  posOfflineController.syncOrdersBatch,
);
