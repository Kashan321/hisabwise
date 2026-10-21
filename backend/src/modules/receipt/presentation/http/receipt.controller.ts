import { Request, Response } from 'express';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { success } from '../../../../shared/http/api-response';
import {
  getPlatformReceiptTemplate,
  getReceiptTemplateBundleForBusiness,
  resolveReceiptTemplateForBusiness,
  updateBusinessReceiptTemplateOverride,
  updatePlatformReceiptTemplate,
} from '../../receipt-template.service';

export class ReceiptController {
  getMine = asyncHandler(async (req: Request, res: Response) => {
    const template = await resolveReceiptTemplateForBusiness(req.tenantContext!.businessId);
    return success(res, { template });
  });
}

export class PlatformReceiptController {
  getGlobal = asyncHandler(async (_req: Request, res: Response) => {
    const template = await getPlatformReceiptTemplate();
    return success(res, { template });
  });

  updateGlobal = asyncHandler(async (req: Request, res: Response) => {
    const template = await updatePlatformReceiptTemplate(req.body);
    return success(res, { template });
  });

  getBusiness = asyncHandler(async (req: Request, res: Response) => {
    const bundle = await getReceiptTemplateBundleForBusiness(String(req.params.businessId));
    return success(res, bundle);
  });

  updateBusiness = asyncHandler(async (req: Request, res: Response) => {
    const businessId = String(req.params.businessId);
    await updateBusinessReceiptTemplateOverride(businessId, req.body.override);
    const bundle = await getReceiptTemplateBundleForBusiness(businessId);
    return success(res, bundle);
  });
}

export const receiptController = new ReceiptController();
export const platformReceiptController = new PlatformReceiptController();
