import { isCosConfigured } from './cos/cos-config';
import { CosStorageService } from './cos/cos-storage.service';
import type { FileStorageService } from '../domain/file-storage';
import { isR2Configured } from './r2/r2-config';
import { R2StorageService } from './r2/r2-storage.service';

function createFileStorageService(): FileStorageService {
  if (isR2Configured()) {
    return new R2StorageService();
  }
  if (isCosConfigured()) {
    return new CosStorageService();
  }
  return new R2StorageService();
}

const storageService = createFileStorageService();

export const fileStorageService = storageService;
