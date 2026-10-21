import { z } from 'zod';
import { nullableStorageReferenceSchema, storageReferenceSchema } from '../../../../shared/files/storage-reference-schema';

const priceSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal e.g. 4.50')
  .or(z.number().positive().transform(String));

const optionalCostPriceSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Base price must be a valid decimal e.g. 4.50')
  .or(z.number().min(0).transform(String))
  .optional();

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional(),
  price: priceSchema,
  basePrice: optionalCostPriceSchema,
  imageUrl: storageReferenceSchema.optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateMenuItemSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  price: priceSchema.optional(),
  basePrice: optionalCostPriceSchema.nullable().optional(),
  imageUrl: nullableStorageReferenceSchema.optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const createModifierGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  isRequired: z.boolean().optional(),
  minSelect: z.number().int().min(0).optional(),
  maxSelect: z.number().int().min(1).optional(),
});

export const updateModifierGroupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  isRequired: z.boolean().optional(),
  minSelect: z.number().int().min(0).optional(),
  maxSelect: z.number().int().min(1).optional(),
});

export const createModifierOptionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  priceAdjustment: priceSchema.optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateModifierOptionSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  priceAdjustment: priceSchema.optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const linkModifierGroupSchema = z.object({
  modifierGroupId: z.string().uuid(),
});

export const createMenuItemVariantSchema = z.object({
  name: z.string().trim().min(1).max(100),
  price: priceSchema,
  basePrice: optionalCostPriceSchema,
  displayOrder: z.number().int().min(0).optional(),
});

export const updateMenuItemVariantSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  price: priceSchema.optional(),
  basePrice: optionalCostPriceSchema.nullable().optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});
