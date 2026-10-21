import { Request, Response } from 'express';
import { tenantsModule } from '../../infrastructure/tenants.module';
import { detectBusinessCurrencyUseCase } from '../../application/use-cases/detect-business-currency.use-case';
import { receiptController } from '../../../receipt/presentation/http/receipt.controller';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';

export class BusinessController {
  getMine = asyncHandler(async (req: Request, res: Response) => {
    const business = await tenantsModule.getBusiness.execute(req.tenantContext!.businessId);
    return success(res, { business });
  });

  updateMine = asyncHandler(async (req: Request, res: Response) => {
    const business = await tenantsModule.updateBusiness.execute(
      req.tenantContext!.businessId,
      req.body,
    );
    return success(res, { business });
  });

  detectCurrency = asyncHandler(async (req: Request, res: Response) => {
    const business = await detectBusinessCurrencyUseCase.execute(
      req.tenantContext!.businessId,
      req.body.country,
    );
    return success(res, { business });
  });

  getReceiptTemplate = receiptController.getMine;
}

export const businessController = new BusinessController();
