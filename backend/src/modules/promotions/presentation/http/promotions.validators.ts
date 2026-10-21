import { z } from 'zod';

const discountTypeEnum = z.enum(['PERCENTAGE', 'FIXED']);

export const createPromotionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  discountType: discountTypeEnum,
  discountValue: z.number().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const updatePromotionSchema = createPromotionSchema.partial();

export const listPromotionsQuerySchema = z.object({
  activeOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
