import { Request, Response } from 'express';
import { inventoryDailyModule } from '../../infrastructure/inventory-daily.module';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import {
  InventoryDailySessionAlreadyOpenError,
  InventoryDailySessionClosedError,
  InventoryDailySessionNotFoundError,
} from '../../domain/errors/inventory-daily.errors';

function handleError(res: Response, err: unknown) {
  if (err instanceof InventoryDailySessionNotFoundError) {
    return res.status(404).json({ success: false, error: { message: err.message } });
  }
  if (err instanceof InventoryDailySessionAlreadyOpenError) {
    return res.status(409).json({ success: false, error: { message: err.message } });
  }
  if (err instanceof InventoryDailySessionClosedError) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
  if (err instanceof Error && err.message === 'Inventory item not found') {
    return res.status(404).json({ success: false, error: { message: err.message } });
  }
  throw err;
}

export class InventoryDailyController {
  getCurrent = asyncHandler(async (req: Request, res: Response) => {
    const session = await inventoryDailyModule.getCurrent.execute(req.tenantContext!.businessId);
    return success(res, { session });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const sessions = await inventoryDailyModule.list.execute(req.tenantContext!.businessId, limit);
    return success(res, { sessions });
  });

  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const dashboard = await inventoryDailyModule.getDashboard.execute(req.tenantContext!.businessId);
    return success(res, dashboard);
  });

  getSummary = asyncHandler(async (req: Request, res: Response) => {
    try {
      const summary = await inventoryDailyModule.getSummary.execute(
        req.tenantContext!.businessId,
        String(req.params.id),
      );
      return success(res, summary);
    } catch (err) {
      return handleError(res, err);
    }
  });

  listMovements = asyncHandler(async (req: Request, res: Response) => {
    try {
      const movements = await inventoryDailyModule.listMovements.execute(
        req.tenantContext!.businessId,
        String(req.params.id),
      );
      return success(res, { movements });
    } catch (err) {
      return handleError(res, err);
    }
  });

  open = asyncHandler(async (req: Request, res: Response) => {
    try {
      const session = await inventoryDailyModule.open.execute(
        req.tenantContext!.businessId,
        req.tenantContext!.userId,
        req.body,
      );
      return success(res, { session }, 201);
    } catch (err) {
      return handleError(res, err);
    }
  });

  close = asyncHandler(async (req: Request, res: Response) => {
    try {
      const session = await inventoryDailyModule.close.execute(
        req.tenantContext!.businessId,
        String(req.params.id),
        req.tenantContext!.userId,
        req.body,
      );
      return success(res, { session });
    } catch (err) {
      return handleError(res, err);
    }
  });

  recordPurchase = asyncHandler(async (req: Request, res: Response) => {
    try {
      const purchase = await inventoryDailyModule.recordPurchase.execute(
        req.tenantContext!.businessId,
        String(req.params.id),
        req.tenantContext!.userId,
        req.body,
      );
      return success(res, { purchase }, 201);
    } catch (err) {
      return handleError(res, err);
    }
  });

  recordWastage = asyncHandler(async (req: Request, res: Response) => {
    try {
      const movement = await inventoryDailyModule.recordWastage.execute(
        req.tenantContext!.businessId,
        String(req.params.id),
        req.tenantContext!.userId,
        req.body,
      );
      return success(res, { movement }, 201);
    } catch (err) {
      return handleError(res, err);
    }
  });

  recordAdjustment = asyncHandler(async (req: Request, res: Response) => {
    try {
      const movement = await inventoryDailyModule.recordAdjustment.execute(
        req.tenantContext!.businessId,
        String(req.params.id),
        req.tenantContext!.userId,
        req.body,
      );
      return success(res, { movement }, 201);
    } catch (err) {
      return handleError(res, err);
    }
  });
}

export const inventoryDailyController = new InventoryDailyController();
