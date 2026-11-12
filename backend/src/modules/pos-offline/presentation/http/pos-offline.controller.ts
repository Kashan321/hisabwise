import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { success } from '../../../../shared/http/api-response';
import { posOfflineModule } from '../../infrastructure/pos-offline.module';

export class PosOfflineController {
  registerDevice = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.tenantContext!.businessId;
    const device = await posOfflineModule.registerDevice.execute(
      businessId,
      req.body.deviceKey,
      req.body.label,
    );
    return success(res, { device });
  });

  getSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const snapshot = await posOfflineModule.getSnapshot.execute(req.tenantContext!.businessId);
    return success(res, { snapshot });
  });

  syncOrdersBatch = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.tenantContext!.businessId;
    const actorId = req.tenantContext!.userId;
    const results = await posOfflineModule.syncBatch.execute(
      businessId,
      actorId,
      req.body.orders,
    );
    return success(res, { results });
  });
}

export const posOfflineController = new PosOfflineController();
