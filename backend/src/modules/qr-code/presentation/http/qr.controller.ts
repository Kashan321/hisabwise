import { Request, Response } from 'express';
import { qrCodeService } from '../../infrastructure/qr-code.service';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';

export class QrController {
  counter = asyncHandler(async (req: Request, res: Response) => {
    const qr = await qrCodeService.getCounterQr(req.tenantContext!.businessId);
    return success(res, { qr });
  });

  table = asyncHandler(async (req: Request, res: Response) => {
    const qr = await qrCodeService.getTableQr(
      req.tenantContext!.businessId,
      String(req.params.tableId),
    );
    return success(res, { qr });
  });
}

export const qrController = new QrController();
