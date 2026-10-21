import { z } from 'zod';

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

const uuidSchema = z.string().uuid();

export const reportDateRangeQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const reportFiltersQuerySchema = reportDateRangeQuerySchema.extend({
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR']).optional(),
  paymentMethod: z
    .enum(['CASH', 'CARD', 'BANK_TRANSFER', 'WALLET', 'ONLINE', 'OTHER'])
    .optional(),
  employeeId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  menuItemId: uuidSchema.optional(),
  tableId: uuidSchema.optional(),
  riderId: uuidSchema.optional(),
  customerId: uuidSchema.optional(),
  promotionId: uuidSchema.optional(),
  cashShiftId: uuidSchema.optional(),
  businessDayId: uuidSchema.optional(),
  inventoryItemId: uuidSchema.optional(),
  supplier: z.string().max(200).optional(),
  status: z
    .enum(['RECEIVED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'])
    .optional(),
});

export const productReportQuerySchema = reportFiltersQuerySchema.extend({
  sort: z.enum(['quantity', 'revenue']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const orderReportQuerySchema = reportFiltersQuerySchema.extend({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().max(100).optional(),
});

export const listInvoicesQuerySchema = reportDateRangeQuerySchema.extend({
  paymentMethod: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'WALLET', 'ONLINE', 'OTHER']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
