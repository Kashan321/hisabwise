import type { FileStorageService } from '../../domain/file-storage';
import { normalizeStorageKey } from '../../infrastructure/storage-reference';

export class GetFileReadUrlUseCase {
  constructor(private readonly storageService: FileStorageService) {}

  async execute(reference: string) {
    const key = normalizeStorageKey(reference);
    const url = await this.storageService.getReadUrl(key);
    return { key, url };
  }
}
