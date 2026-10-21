import { Request, Response } from 'express';
import { z } from 'zod';
import { filesModule } from '../../infrastructure/files.module';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { FileRequiredError } from '../../domain/errors/file.errors';
import { uploadFileQuerySchema, fileReadUrlQuerySchema } from './files.validators';

type UploadFileQuery = z.infer<typeof uploadFileQuerySchema>;
type FileReadUrlQuery = z.infer<typeof fileReadUrlQuerySchema>;

export class FilesController {
  upload = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new FileRequiredError();
    }

    const { folder } = req.validatedQuery as UploadFileQuery;
    const file = await filesModule.uploadFile.execute(
      req.tenantContext!.businessId,
      req.file,
      folder,
    );

    return success(res, { file }, 201);
  });

  readUrl = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.validatedQuery as FileReadUrlQuery;
    const result = await filesModule.getFileReadUrl.execute(key);
    return success(res, result);
  });
}

export const filesController = new FilesController();
