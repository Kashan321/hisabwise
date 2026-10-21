import { prisma } from '../../../shared/database/prisma-client';
import { MenuGalleryCsvImportError } from '../domain/errors/menu-gallery.errors';
import { parseMenuGalleryCsv } from './menu-gallery-csv';

export interface MenuGalleryCsvImportResult {
  created: number;
}

export class ImportMenuGalleryCsvUseCase {
  async execute(csvContent: string): Promise<MenuGalleryCsvImportResult> {
    const { rows, errors } = parseMenuGalleryCsv(csvContent);

    if (errors.length) {
      throw new MenuGalleryCsvImportError(errors);
    }

    if (!rows.length) {
      throw new MenuGalleryCsvImportError([{ lineNumber: 1, message: 'No gallery rows found in CSV' }]);
    }

    await prisma.platformMenuGalleryImage.createMany({
      data: rows.map((row) => ({
        label: row.label,
        searchTerms: row.searchTerms,
        imageUrl: row.imageUrl,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
      })),
    });

    return { created: rows.length };
  }
}

export const importMenuGalleryCsvUseCase = new ImportMenuGalleryCsvUseCase();
