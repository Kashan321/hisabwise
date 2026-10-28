import { Request, Response } from 'express';
import { floorPlanModule } from '../../infrastructure/floor-plan.module';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';

export class FloorPlanController {
  listPlans = asyncHandler(async (req: Request, res: Response) => {
    const plans = await floorPlanModule.listPlans.execute(req.tenantContext!.businessId);
    return success(res, { plans });
  });

  getScene = asyncHandler(async (req: Request, res: Response) => {
    const scene = await floorPlanModule.getFloorScene.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, scene);
  });

  createPlan = asyncHandler(async (req: Request, res: Response) => {
    const plan = await floorPlanModule.createPlan.execute(
      req.tenantContext!.businessId,
      req.body,
    );
    return success(res, { plan }, 201);
  });

  updatePlan = asyncHandler(async (req: Request, res: Response) => {
    const plan = await floorPlanModule.updatePlan.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { plan });
  });

  deletePlan = asyncHandler(async (req: Request, res: Response) => {
    await floorPlanModule.deletePlan.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { message: 'Floor plan deleted' });
  });

  createElement = asyncHandler(async (req: Request, res: Response) => {
    const element = await floorPlanModule.createElement.execute(
      req.tenantContext!.businessId,
      String(req.params.planId),
      req.body,
    );
    return success(res, { element }, 201);
  });

  updateElement = asyncHandler(async (req: Request, res: Response) => {
    const element = await floorPlanModule.updateElement.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { element });
  });

  deleteElement = asyncHandler(async (req: Request, res: Response) => {
    await floorPlanModule.deleteElement.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { message: 'Element deleted' });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const floorPlanId =
      typeof req.query.floorPlanId === 'string' ? req.query.floorPlanId : undefined;
    const tables = await floorPlanModule.listTables.execute(
      req.tenantContext!.businessId,
      floorPlanId,
    );
    return success(res, { tables });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const table = await floorPlanModule.createTable.execute(
      req.tenantContext!.businessId,
      req.body,
    );
    return success(res, { table }, 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const table = await floorPlanModule.updateTable.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { table });
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const table = await floorPlanModule.updateTableStatus.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.status,
    );
    return success(res, { table });
  });

  freeTable = asyncHandler(async (req: Request, res: Response) => {
    const table = await floorPlanModule.freeTable.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      {
        userId: req.tenantContext!.userId,
        userName: req.tenantContext!.userName,
      },
    );
    return success(res, { table });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await floorPlanModule.deleteTable.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { message: 'Table deleted' });
  });
}

export const floorPlanController = new FloorPlanController();
