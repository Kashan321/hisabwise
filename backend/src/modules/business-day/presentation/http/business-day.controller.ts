import type { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { success } from '../../../../shared/http/api-response';
import { businessDayModule } from '../../infrastructure/business-day.module';

export const businessDayController = {
  getCurrent: asyncHandler(async (req: Request, res: Response) => {
    const result = await businessDayModule.getCurrent.execute(req.tenantContext!.businessId);
    return success(res, result);
  }),

  open: asyncHandler(async (req: Request, res: Response) => {
    const day = await businessDayModule.open.execute(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
    );
    return success(res, { businessDay: day }, 201);
  }),

  close: asyncHandler(async (req: Request, res: Response) => {
    const day = await businessDayModule.close.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.tenantContext!.userId,
    );
    return success(res, { businessDay: day });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validatedQuery as { limit?: number };
    const days = await businessDayModule.list.execute(req.tenantContext!.businessId, query);
    return success(res, { businessDays: days });
  }),

  getSummary: asyncHandler(async (req: Request, res: Response) => {
    const summary = await businessDayModule.getSummary.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, summary);
  }),
};
