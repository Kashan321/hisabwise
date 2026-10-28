import { z } from 'zod';

export const createPublicOrderSchema = z.object({
  tableId: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
        variantId: z.string().uuid().optional(),
        weightG: z.number().int().min(1).max(20_000).optional(),
        modifierOptionIds: z.array(z.string().uuid()).optional(),
        customizationNotes: z.string().trim().max(500).optional(),
      }),
    )
    .min(1),
  notes: z.string().trim().max(500).optional(),
});
