import { Request, Response } from 'express';
import { cashShiftModule } from '../../infrastructure/cash-shift.module';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';

export class CashShiftController {
  getCurrent = asyncHandler(async (req: Request, res: Response) => {
    const shift = await cashShiftModule.getCurrent.execute(req.tenantContext!.businessId);
    return success(res, { shift });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validatedQuery as {
      status?: 'OPEN' | 'CLOSED';
      limit?: number;
    };
    const shifts = await cashShiftModule.list.execute(req.tenantContext!.businessId, query);
    return success(res, { shifts });
  });

  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const summary = await cashShiftModule.getSummary.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, summary);
  });

  open = asyncHandler(async (req: Request, res: Response) => {
    const shift = await cashShiftModule.open.execute(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
      req.body.openingCash,
    );
    return success(res, { shift }, 201);
  });

  close = asyncHandler(async (req: Request, res: Response) => {
    const shift = await cashShiftModule.close.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.tenantContext!.userId,
      req.body,
    );
    return success(res, { shift });
  });

  listSettlementAccounts = asyncHandler(async (req: Request, res: Response) => {
    const accounts = await cashShiftModule.listSettlementAccounts.execute(
      req.tenantContext!.businessId,
    );
    return success(res, { accounts });
  });

  addMovement = asyncHandler(async (req: Request, res: Response) => {
    const movement = await cashShiftModule.addMovement.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.type,
      req.body.amount,
      req.body.reason,
      req.tenantContext!.userId,
    );
    return success(res, { movement }, 201);
  });

  listPendingRiderHandoffs = asyncHandler(async (req: Request, res: Response) => {
    const result = await cashShiftModule.listPendingRiderHandoffs.execute(
      req.tenantContext!.businessId,
    );
    return success(res, result);
  });

  confirmRiderCashHandoff = asyncHandler(async (req: Request, res: Response) => {
    const result = await cashShiftModule.confirmRiderCashHandoff.execute(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
      {
        settlementId: req.body.settlementId,
        riderId: req.body.riderId,
      },
    );
    return success(res, result);
  });
}

export const cashShiftController = new CashShiftController();
