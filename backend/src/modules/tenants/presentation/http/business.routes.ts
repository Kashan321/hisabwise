import { Router } from 'express';
import { requireAuth, requirePermission } from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { businessController } from './business.controller';
import { updateBusinessSchema, detectCurrencySchema } from './business.validators';

export const businessRouter = Router();

businessRouter.get('/me', requireAuth, businessController.getMine);
businessRouter.get('/me/receipt-template', requireAuth, businessController.getReceiptTemplate);

businessRouter.patch(
  '/me',
  requireAuth,
  requirePermission('business.manage'),
  validateBody(updateBusinessSchema),
  businessController.updateMine,
);

businessRouter.post(
  '/detect-currency',
  requireAuth,
  validateBody(detectCurrencySchema),
  businessController.detectCurrency,
);
