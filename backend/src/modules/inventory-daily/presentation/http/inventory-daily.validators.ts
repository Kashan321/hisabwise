import { z } from 'zod';

export const openDailySessionSchema = z.object({
  sessionDate: z.string().optional(),
  shiftName: z.string().max(100).optional(),
  openingNotes: z.string().max(500).optional(),
});

export const closeDailySessionSchema = z.object({
  lines: z.array(
    z.object({
      inventoryItemId: z.string().uuid(),
      actualClosingQuantity: z.number(),
    }),
  ),
  closingNotes: z.string().max(500).optional(),
});

export const recordPurchaseSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative().optional(),
  supplier: z.string().max(200).optional(),
  supplierId: z.string().uuid().optional(),
  invoiceRef: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  purchasedAt: z.string().datetime().optional(),
});

export const recordWastageSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().positive(),
  reason: z.enum(['SPOILED', 'DAMAGED', 'EXPIRED', 'PREPARATION_WASTE', 'OTHER']),
  notes: z.string().max(500).optional(),
});

export const recordDailyAdjustmentSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantityDelta: z.number().refine((v) => v !== 0, 'Adjustment quantity cannot be zero'),
  note: z.string().max(500).optional(),
});
