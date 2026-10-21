import type { FileStorageService } from '../../domain/file-storage';

export class UploadFileUseCase {
  constructor(private readonly storageService: FileStorageService) {}

  execute(
    businessId: string,
    file: Express.Multer.File,
    folder?: string,
  ) {
    return this.storageService.upload({
      businessId,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
      folder,
    });
  }
}
