import { Router } from 'express';
import { requireAuth } from '../../../auth/presentation/middlewares/require-auth.middleware';
import { tenantTenantAlertsController } from './tenant-alerts.controller';

export const tenantAlertsRouter = Router();

tenantAlertsRouter.get('/current', requireAuth, tenantTenantAlertsController.current);
tenantAlertsRouter.post('/:id/dismiss', requireAuth, tenantTenantAlertsController.dismiss);
