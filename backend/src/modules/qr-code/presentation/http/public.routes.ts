import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { demoController } from '../../../demo/presentation/http/demo.controller';
import { createDemoRequestSchema } from '../../../demo/presentation/http/demo.validators';
import { publicController } from './public.controller';
import { createPublicOrderSchema } from './public.validators';

export const publicRouter = Router();

const publicOrderRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const publicDemoRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

publicRouter.get('/branding', publicController.getBranding);
publicRouter.get('/pricing', demoController.getPricing);
publicRouter.get('/demo', demoController.getDemoConfig);
publicRouter.post(
  '/demo-requests',
  publicDemoRateLimiter,
  validateBody(createDemoRequestSchema),
  demoController.createRequest,
);
publicRouter.post('/calendly/webhook', demoController.calendlyWebhook);
publicRouter.get('/:businessSlug', publicController.getBusiness);
publicRouter.get('/:businessSlug/tables/:tableIdentifier', publicController.getTable);
publicRouter.post(
  '/:businessSlug/orders',
  publicOrderRateLimiter,
  validateBody(createPublicOrderSchema),
  publicController.createOrder,
);
publicRouter.get('/:businessSlug/orders/:orderId', publicController.getOrder);
