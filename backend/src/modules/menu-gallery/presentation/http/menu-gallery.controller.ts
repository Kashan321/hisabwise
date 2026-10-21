import { Request, Response } from 'express';
import { PLATFORM_STORAGE_SCOPE } from '../../../../config/platform.constants';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { success } from '../../../../shared/http/api-response';
import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { FileRequiredError } from '../../../files/domain/errors/file.errors';
import { filesModule } from '../../../files/infrastructure/files.module';
import { MENU_GALLERY_CSV_SAMPLE } from '../../application/menu-gallery-csv';
import { importMenuGalleryCsvUseCase } from '../../application/import-menu-gallery-csv.use-case';
import { menuGalleryService } from '../../infrastructure/menu-gallery.service';

export class PlatformMenuGalleryController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    const images = await menuGalleryService.listForPlatform();
    return success(res, { images });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const image = await menuGalleryService.create(req.body);
    return success(res, { image }, 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const image = await menuGalleryService.update(String(req.params.id), req.body);
    return success(res, { image });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await menuGalleryService.delete(String(req.params.id));
    return success(res, { message: 'Gallery image deleted' });
  });

  uploadImage = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new FileRequiredError();
    }

    const folder = typeof req.query.folder === 'string' ? req.query.folder : 'menu-gallery';
    const file = await filesModule.uploadFile.execute(
      PLATFORM_STORAGE_SCOPE,
      req.file,
      folder,
    );

    return success(res, { file }, 201);
  });

  downloadImportSample = asyncHandler(async (_req: Request, res: Response) => {
    return success(res, {
      csv: MENU_GALLERY_CSV_SAMPLE,
      filename: 'venta-menu-gallery-sample.csv',
    });
  });

  importCsv = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file?.buffer) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'CSV file is required', 400);
    }

    const result = await importMenuGalleryCsvUseCase.execute(req.file.buffer.toString('utf-8'));
    return success(res, { import: result }, 201);
  });

  importCsvPaste = asyncHandler(async (req: Request, res: Response) => {
    const result = await importMenuGalleryCsvUseCase.execute(req.body.csv);
    return success(res, { import: result }, 201);
  });
}

export class TenantMenuGalleryController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    const images = await menuGalleryService.listActiveForTenants();
    return success(res, { images });
  });
}

export const platformMenuGalleryController = new PlatformMenuGalleryController();
export const tenantMenuGalleryController = new TenantMenuGalleryController();
