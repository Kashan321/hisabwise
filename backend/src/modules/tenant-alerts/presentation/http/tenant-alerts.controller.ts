import { Request, Response } from 'express';
import { PLATFORM_STORAGE_SCOPE } from '../../../../config/platform.constants';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { success } from '../../../../shared/http/api-response';
import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { FileRequiredError } from '../../../files/domain/errors/file.errors';
import { filesModule } from '../../../files/infrastructure/files.module';
import { tenantAlertsService } from '../../infrastructure/tenant-alerts.service';
import type {
  CreatePlatformTenantAlertBody,
  UpdatePlatformTenantAlertBody,
} from './tenant-alerts.validators';

function mapValidationError(error: unknown): never {
  if (error instanceof Error) {
    if (error.message === 'INVALID_DATE') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid date format', 400);
    }
    if (error.message === 'INVALID_RANGE') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'End date must be on or after start date', 400);
    }
    if (error.message === 'NOT_FOUND') {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Alert not found', 404);
    }
  }
  throw error;
}

function normalizeOptionalUrl(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  return value;
}

export class PlatformTenantAlertsController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    const alerts = await tenantAlertsService.listForPlatform();
    return success(res, { alerts });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as CreatePlatformTenantAlertBody;
    try {
      const alert = await tenantAlertsService.create({
        bodyText: body.bodyText,
        linkUrl: normalizeOptionalUrl(body.linkUrl),
        linkLabel: body.linkLabel ?? null,
        imageUrl: normalizeOptionalUrl(body.imageUrl),
        startDate: body.startDate,
        endDate: body.endDate,
        isActive: body.isActive,
      });
      return success(res, { alert }, 201);
    } catch (e) {
      mapValidationError(e);
    }
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as UpdatePlatformTenantAlertBody;
    try {
      const alert = await tenantAlertsService.update(String(req.params.id), {
        ...(body.bodyText !== undefined ? { bodyText: body.bodyText } : {}),
        ...(body.linkUrl !== undefined ? { linkUrl: normalizeOptionalUrl(body.linkUrl) } : {}),
        ...(body.linkLabel !== undefined ? { linkLabel: body.linkLabel ?? null } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: normalizeOptionalUrl(body.imageUrl) } : {}),
        ...(body.startDate !== undefined ? { startDate: body.startDate } : {}),
        ...(body.endDate !== undefined ? { endDate: body.endDate } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      });
      return success(res, { alert });
    } catch (e) {
      mapValidationError(e);
    }
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    try {
      await tenantAlertsService.delete(String(req.params.id));
      return success(res, { message: 'Alert deleted' });
    } catch (e) {
      mapValidationError(e);
    }
  });

  uploadImage = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new FileRequiredError();
    }
    const folder = typeof req.query.folder === 'string' ? req.query.folder : 'tenant-alerts';
    const file = await filesModule.uploadFile.execute(PLATFORM_STORAGE_SCOPE, req.file, folder);
    return success(res, { file }, 201);
  });
}

export class TenantTenantAlertsController {
  current = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.tenantContext!.userId;
    const alert = await tenantAlertsService.getCurrentForUser(userId);
    return success(res, { alert });
  });

  dismiss = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.tenantContext!.userId;
    try {
      await tenantAlertsService.dismissForUser(userId, String(req.params.id));
      return success(res, { dismissed: true });
    } catch (e) {
      mapValidationError(e);
    }
  });
}

export const platformTenantAlertsController = new PlatformTenantAlertsController();
export const tenantTenantAlertsController = new TenantTenantAlertsController();
