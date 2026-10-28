import { z } from 'zod';
import { MAX_WEIGHT_G } from '../../../../shared/pricing/weight-line-pricing';
import { nullableStorageReferenceSchema } from '../../../../shared/files/storage-reference-schema';

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

const pricingTypeSchema = z.enum(['fixed', 'by_weight']).optional().default('fixed');
const pricingUnitGSchema = z.union([
  z.literal(1000),
  z.literal(500),
  z.literal(250),
  z.literal(100),
]);

const weightConfigFields = {
  pricingType: pricingTypeSchema,
  pricePerUnit: priceSchema.optional(),
  pricingUnitG: pricingUnitGSchema.optional(),
  minWeightG: z.number().int().min(1).max(MAX_WEIGHT_G).optional().nullable(),
  weightStepG: z.number().int().min(1).max(5000).optional().nullable(),
  quickWeightsG: z.array(z.number().int().min(1).max(MAX_WEIGHT_G)).max(12).optional().nullable(),
  priceRounding: z.union([z.literal(1), z.literal(5), z.literal(10)]).optional().nullable(),
};

export const createMenuItemSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().max(500).optional(),
    price: priceSchema.optional(),
    basePrice: optionalCostPriceSchema.nullable().optional(),
    imageUrl: nullableStorageReferenceSchema.optional(),
    displayOrder: z.number().int().min(0).optional(),
    ...weightConfigFields,
  })
  .superRefine((data, ctx) => {
    if (data.pricingType === 'by_weight') {
      if (data.pricePerUnit == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Price per unit is required for sell-by-weight items',
          path: ['pricePerUnit'],
        });
      }
    } else if (data.price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Price is required',
        path: ['price'],
      });
    }
  });

export const updateMenuItemSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    price: priceSchema.optional(),
    basePrice: optionalCostPriceSchema.nullable().optional(),
    imageUrl: nullableStorageReferenceSchema.optional(),
    isAvailable: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
    ...weightConfigFields,
  })
  .superRefine((data, ctx) => {
    if (data.pricingType === 'by_weight' && data.pricePerUnit == null && data.price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Price per unit is required when switching to sell by weight',
        path: ['pricePerUnit'],
      });
    }
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
