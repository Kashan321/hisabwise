import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import { filesController } from './files.controller';
import { uploadFileQuerySchema, fileReadUrlQuerySchema } from './files.validators';
import { uploadSingleFile } from '../middlewares/upload.middleware';

const canUpload = requireAnyPermission(
  'menu.manage',
  'business.manage',
  'promotions.manage',
  'qr.manage',
  'feedback.manage',
);

const canReadFiles = requireAnyPermission(
  'menu.manage',
  'business.manage',
  'promotions.manage',
  'qr.manage',
  'orders.manage',
  'kitchen.manage',
  'feedback.manage',
);

export const filesRouter = Router();

filesRouter.get(
  '/read-url',
  requireAuth,
  canReadFiles,
  validateQuery(fileReadUrlQuerySchema),
  filesController.readUrl,
);

filesRouter.post(
  '/upload',
  requireAuth,
  canUpload,
  validateQuery(uploadFileQuerySchema),
  uploadSingleFile,
  filesController.upload,
);
