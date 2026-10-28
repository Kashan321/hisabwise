import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
  requirePermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import { promotionsController } from './promotions.controller';
import {
  createPromotionSchema,
  listPromotionsQuerySchema,
  updatePromotionSchema,
} from './promotions.validators';

const canView = requirePermission('promotions.manage');
const canManage = requirePermission('promotions.manage');

export const promotionsRouter = Router();

promotionsRouter.get(
  '/',
  requireAuth,
  validateQuery(listPromotionsQuerySchema),
  (req, res, next) => {
    const activeOnly = req.query.activeOnly === 'true';
    const guard = activeOnly
      ? requireAnyPermission(
          'promotions.manage',
          'orders.manage',
          'orders.create',
          'orders.serve',
        )
      : canView;
    return guard(req, res, next);
  },
  promotionsController.list,
);

promotionsRouter.post(
  '/',
  requireAuth,
  canManage,
  validateBody(createPromotionSchema),
  promotionsController.create,
);

promotionsRouter.get('/:id', requireAuth, canView, promotionsController.getById);

promotionsRouter.patch(
  '/:id',
  requireAuth,
  canManage,
  validateBody(updatePromotionSchema),
  promotionsController.update,
);

promotionsRouter.patch('/:id/activate', requireAuth, canManage, promotionsController.activate);

promotionsRouter.patch(
  '/:id/deactivate',
  requireAuth,
  canManage,
  promotionsController.deactivate,
);

promotionsRouter.post(
  '/:id/broadcast',
  requireAuth,
  canManage,
  promotionsController.broadcast,
);
