import { z } from 'zod';
import { storageReferenceSchema } from '../../../../shared/files/storage-reference-schema';

export const createMenuGalleryImageSchema = z.object({
  label: z.string().trim().min(1).max(120),
  searchTerms: z.string().trim().max(500).nullable().optional(),
  imageUrl: storageReferenceSchema,
  displayOrder: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional(),
});

export const updateMenuGalleryImageSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  searchTerms: z.string().trim().max(500).nullable().optional(),
  imageUrl: storageReferenceSchema.optional(),
  displayOrder: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional(),
});

export const importMenuGalleryCsvPasteSchema = z.object({
  csv: z.string().min(1),
});
