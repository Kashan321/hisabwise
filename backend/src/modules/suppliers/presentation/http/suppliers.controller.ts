import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { success } from '../../../../shared/http/api-response';
import { suppliersModule } from '../../infrastructure/suppliers.module';
import { SupplierNameTakenError, SupplierNotFoundError } from '../../domain/errors/supplier.errors';

function handleError(res: Response, err: unknown) {
  if (err instanceof SupplierNotFoundError) {
    return res.status(404).json({ success: false, error: { message: err.message } });
  }
  if (err instanceof SupplierNameTakenError) {
    return res.status(409).json({ success: false, error: { message: err.message } });
  }
  throw err;
}

export class SuppliersController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === 'true';
    const suppliers = await suppliersModule.list(req.tenantContext!.businessId, includeInactive);
    return success(res, { suppliers });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    try {
      const supplier = await suppliersModule.get(
        req.tenantContext!.businessId,
        String(req.params.id),
      );
      return success(res, { supplier });
    } catch (err) {
      return handleError(res, err);
    }
  });

  getLedger = asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = await suppliersModule.getLedger(
        req.tenantContext!.businessId,
        String(req.params.id),
      );
      return success(res, data);
    } catch (err) {
      return handleError(res, err);
    }
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    try {
      const supplier = await suppliersModule.create(req.tenantContext!.businessId, req.body);
      return success(res, { supplier }, 201);
    } catch (err) {
      return handleError(res, err);
    }
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    try {
      const supplier = await suppliersModule.update(
        req.tenantContext!.businessId,
        String(req.params.id),
        req.body,
      );
      return success(res, { supplier });
    } catch (err) {
      return handleError(res, err);
    }
  });

  recordPayment = asyncHandler(async (req: Request, res: Response) => {
    try {
      const payment = await suppliersModule.recordPayment(
        req.tenantContext!.businessId,
        String(req.params.id),
        req.tenantContext!.userId,
        req.body,
      );
      return success(res, { payment }, 201);
    } catch (err) {
      return handleError(res, err);
    }
  });
}

export const suppliersController = new SuppliersController();
