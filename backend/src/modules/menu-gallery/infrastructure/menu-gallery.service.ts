import { prisma } from '../../../shared/database/prisma-client';
import { filesModule } from '../../files/infrastructure/files.module';

export type MenuGalleryImageRecord = {
  id: string;
  label: string;
  searchTerms: string | null;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MenuGalleryImageDto = MenuGalleryImageRecord & {
  imageReadUrl: string | null;
};

async function toDto(row: MenuGalleryImageRecord): Promise<MenuGalleryImageDto> {
  const imageReadUrl = row.imageUrl
    ? await filesModule.storageUrlResolver.resolveReadUrl(row.imageUrl)
    : null;
  return { ...row, imageReadUrl };
}

function mapRow(row: {
  id: string;
  label: string;
  searchTerms: string | null;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): MenuGalleryImageRecord {
  return {
    id: row.id,
    label: row.label,
    searchTerms: row.searchTerms,
    imageUrl: row.imageUrl,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const menuGalleryService = {
  async listForPlatform(): Promise<MenuGalleryImageDto[]> {
    const rows = await prisma.platformMenuGalleryImage.findMany({
      orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
    });
    return Promise.all(rows.map((row) => toDto(mapRow(row))));
  },

  async listActiveForTenants(): Promise<MenuGalleryImageDto[]> {
    const rows = await prisma.platformMenuGalleryImage.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }],
    });
    return Promise.all(rows.map((row) => toDto(mapRow(row))));
  },

  async create(input: {
    label: string;
    searchTerms?: string | null;
    imageUrl: string;
    displayOrder?: number;
    isActive?: boolean;
  }): Promise<MenuGalleryImageDto> {
    const row = await prisma.platformMenuGalleryImage.create({
      data: {
        label: input.label.trim(),
        searchTerms: input.searchTerms?.trim() || null,
        imageUrl: input.imageUrl,
        displayOrder: input.displayOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });
    return toDto(mapRow(row));
  },

  async update(
    id: string,
    input: {
      label?: string;
      searchTerms?: string | null;
      imageUrl?: string;
      displayOrder?: number;
      isActive?: boolean;
    },
  ): Promise<MenuGalleryImageDto> {
    const row = await prisma.platformMenuGalleryImage.update({
      where: { id },
      data: {
        ...(input.label !== undefined ? { label: input.label.trim() } : {}),
        ...(input.searchTerms !== undefined
          ? { searchTerms: input.searchTerms?.trim() || null }
          : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    return toDto(mapRow(row));
  },

  async delete(id: string): Promise<void> {
    await prisma.platformMenuGalleryImage.delete({ where: { id } });
  },
};
