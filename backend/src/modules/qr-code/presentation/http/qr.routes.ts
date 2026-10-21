import { Router } from 'express';
import { requireAuth, requirePermission } from '../../../auth/presentation/middlewares/require-auth.middleware';
import { qrController } from './qr.controller';

export const qrRouter = Router();

qrRouter.get('/counter', requireAuth, requirePermission('qr.manage'), qrController.counter);

qrRouter.get(
  '/tables/:tableId',
  requireAuth,
  requirePermission('qr.manage'),
  qrController.table,
);
