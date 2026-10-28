import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
  requirePermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { floorPlanController } from './floor-plan.controller';
import {
  createFloorElementSchema,
  createFloorPlanSchema,
  createTableSchema,
  updateFloorElementSchema,
  updateFloorPlanSchema,
  updateTableSchema,
  updateTableStatusSchema,
} from './floor-plan.validators';

const canViewFloor = requireAnyPermission('floor.manage', 'floor.view', 'orders.view', 'orders.serve');
const canManageFloor = requirePermission('floor.manage');

export const floorPlanRouter = Router();

floorPlanRouter.get('/plans', requireAuth, canViewFloor, floorPlanController.listPlans);
floorPlanRouter.post(
  '/plans',
  requireAuth,
  canManageFloor,
  validateBody(createFloorPlanSchema),
  floorPlanController.createPlan,
);
floorPlanRouter.get('/plans/:id', requireAuth, canViewFloor, floorPlanController.getScene);
floorPlanRouter.patch(
  '/plans/:id',
  requireAuth,
  canManageFloor,
  validateBody(updateFloorPlanSchema),
  floorPlanController.updatePlan,
);
floorPlanRouter.delete('/plans/:id', requireAuth, canManageFloor, floorPlanController.deletePlan);

floorPlanRouter.post(
  '/plans/:planId/elements',
  requireAuth,
  canManageFloor,
  validateBody(createFloorElementSchema),
  floorPlanController.createElement,
);
floorPlanRouter.patch(
  '/elements/:id',
  requireAuth,
  canManageFloor,
  validateBody(updateFloorElementSchema),
  floorPlanController.updateElement,
);
floorPlanRouter.delete('/elements/:id', requireAuth, canManageFloor, floorPlanController.deleteElement);

floorPlanRouter.get('/tables', requireAuth, canViewFloor, floorPlanController.list);

floorPlanRouter.post(
  '/tables',
  requireAuth,
  canManageFloor,
  validateBody(createTableSchema),
  floorPlanController.create,
);

floorPlanRouter.patch(
  '/tables/:id',
  requireAuth,
  canManageFloor,
  validateBody(updateTableSchema),
  floorPlanController.update,
);

floorPlanRouter.patch(
  '/tables/:id/status',
  requireAuth,
  requireAnyPermission('floor.manage', 'floor.view', 'orders.view', 'orders.serve'),
  validateBody(updateTableStatusSchema),
  floorPlanController.updateStatus,
);

floorPlanRouter.post(
  '/tables/:id/free',
  requireAuth,
  requireAnyPermission('floor.manage', 'orders.manage', 'orders.serve'),
  floorPlanController.freeTable,
);

floorPlanRouter.delete('/tables/:id', requireAuth, canManageFloor, floorPlanController.delete);
