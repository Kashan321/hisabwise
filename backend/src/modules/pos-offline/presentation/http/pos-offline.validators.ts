import { z } from 'zod';
import {
  applyCreateOrderRefinements,
  createOrderObjectSchema,
} from '../../../orders/presentation/http/orders.validators';

export const registerPosDeviceSchema = z.object({
  deviceKey: z.string().uuid(),
  label: z.string().trim().max(120).optional(),
});

const offlineCashCompletionSchema = z.object({
  amountReceived: z.number().min(0).optional(),
  changeGiven: z.number().min(0).optional(),
});

export const syncOfflineOrderEntrySchema = createOrderObjectSchema
  .extend({
    idempotencyKey: z.string().uuid(),
    deviceKey: z.string().uuid().optional(),
    offlineTicketNumber: z.number().int().min(1).max(99999).optional(),
    offlineTicketLabel: z.string().trim().max(32).optional(),
    completeWithCash: offlineCashCompletionSchema.optional(),
    snapshotLineUnitPrices: z.record(z.string().uuid(), z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    applyCreateOrderRefinements(data, ctx);
    if (data.completeWithCash && data.orderType === 'DELIVERY') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Offline sync does not support delivery checkout',
        path: ['orderType'],
      });
    }
    if (data.source !== 'STAFF_ASSISTED') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Offline sync only supports staff-assisted orders',
        path: ['source'],
      });
    }
  });

export const syncOfflineOrdersBatchSchema = z.object({
  orders: z.array(syncOfflineOrderEntrySchema).min(1).max(50),
});

export type SyncOfflineOrderInput = z.infer<typeof syncOfflineOrderEntrySchema>;
