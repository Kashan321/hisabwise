import type { FileStorageService } from '../domain/file-storage';
import {
  extractStorageKey,
  isManagedStorageReference,
  normalizeStorageKey,
} from './storage-reference';

export class StorageUrlResolver {
  constructor(private readonly storageService: FileStorageService) {}

  normalizeKey(reference: string): string {
    return normalizeStorageKey(reference);
  }

  async resolveReadUrl(reference: string | null | undefined): Promise<string | null> {
    if (!reference) return null;

    if (!isManagedStorageReference(reference)) {
      return reference;
    }

    const key = extractStorageKey(reference);
    if (!key) return reference;

    return this.storageService.getReadUrl(key);
  }

  async resolveMenuItem<T extends { imageUrl: string | null }>(item: T): Promise<T> {
    return {
      ...item,
      imageUrl: await this.resolveReadUrl(item.imageUrl),
    };
  }

  async resolveMenuCategories<T extends { items: Array<{ imageUrl: string | null }> }>(
    categories: T[],
  ): Promise<T[]> {
    return Promise.all(
      categories.map(async (category) => ({
        ...category,
        items: await Promise.all(category.items.map((item) => this.resolveMenuItem(item))),
      })),
    );
  }

  async resolveBusiness<T extends { logoUrl: string | null }>(business: T): Promise<T> {
    return {
      ...business,
      logoUrl: await this.resolveReadUrl(business.logoUrl),
    };
  }

  async resolveOrder<T extends { items: Array<{ imageUrl: string | null }> }>(order: T): Promise<T> {
    return {
      ...order,
      items: await Promise.all(
        order.items.map(async (item) => ({
          ...item,
          imageUrl: await this.resolveReadUrl(item.imageUrl),
        })),
      ),
    };
  }
}
