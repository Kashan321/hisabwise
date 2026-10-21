import { UploadFileUseCase } from '../application/use-cases/upload-file.use-case';
import { GetFileReadUrlUseCase } from '../application/use-cases/get-file-read-url.use-case';
import { fileStorageService } from './storage.factory';
import { StorageUrlResolver } from './storage-url.resolver';

const storageUrlResolver = new StorageUrlResolver(fileStorageService);

export const filesModule = {
  uploadFile: new UploadFileUseCase(fileStorageService),
  getFileReadUrl: new GetFileReadUrlUseCase(fileStorageService),
  storageUrlResolver,
};
