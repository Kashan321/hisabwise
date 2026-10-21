import { Request, Response } from 'express';
import { z } from 'zod';
import { promotionsModule } from '../../infrastructure/promotions.module';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { listPromotionsQuerySchema } from './promotions.validators';

type ListPromotionsQuery = z.infer<typeof listPromotionsQuerySchema>;

export class PromotionsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const { activeOnly } = req.validatedQuery as ListPromotionsQuery;
    const promotions = await promotionsModule.listPromotions.execute(
      req.tenantContext!.businessId,
      activeOnly,
    );
    return success(res, { promotions });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const promotion = await promotionsModule.createPromotion.execute(
      req.tenantContext!.businessId,
      req.body,
    );
    return success(res, { promotion }, 201);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const promotion = await promotionsModule.getPromotion.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { promotion });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const promotion = await promotionsModule.updatePromotion.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { promotion });
  });

  activate = asyncHandler(async (req: Request, res: Response) => {
    const promotion = await promotionsModule.setPromotionActive.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      true,
    );
    return success(res, { promotion });
  });

  deactivate = asyncHandler(async (req: Request, res: Response) => {
    const promotion = await promotionsModule.setPromotionActive.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      false,
    );
    return success(res, { promotion });
  });

  broadcast = asyncHandler(async (req: Request, res: Response) => {
    const result = await promotionsModule.broadcastPromotion.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, result);
  });
}

export const promotionsController = new PromotionsController();
