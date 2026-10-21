import { z } from 'zod';

const inventoryUnitEnum = z.enum(['KG', 'G', 'LITER', 'ML', 'PIECE', 'PACK', 'BOTTLE']);
const trackingModeEnum = z.enum(['NONE', 'SIMPLE_STOCK', 'RECIPE']);
const movementTypeEnum = z.enum(['SALE', 'SALE_REVERSAL', 'ADJUSTMENT', 'RECEIPT', 'WASTE', 'INITIAL']);

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unit: inventoryUnitEnum,
  currentQuantity: z.coerce.number().min(0).optional(),
  minThreshold: z.coerce.number().min(0).nullable().optional(),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  unit: inventoryUnitEnum.optional(),
  minThreshold: z.coerce.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const receiveStockSchema = z.object({
  quantity: z.coerce.number().positive(),
  note: z.string().trim().max(500).optional(),
});

export const adjustStockSchema = z.object({
  quantityDelta: z.coerce.number().refine((v) => v !== 0, 'quantityDelta must not be zero'),
  note: z.string().trim().max(500).optional(),
  type: movementTypeEnum.optional(),
});

export const listMovementsQuerySchema = z.object({
  inventoryItemId: z.string().uuid().optional(),
  type: movementTypeEnum.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const recipeLineSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit: inventoryUnitEnum,
});

export const sellableInventorySchema = z.object({
  trackingMode: trackingModeEnum,
  inventoryItemId: z.string().uuid().nullable().optional(),
  recipeLines: z.array(recipeLineSchema).optional(),
});
