import { z } from 'zod';
import {
  addOrderItemsSchema,
  applyCreateOrderRefinements,
  createOrderObjectSchema,
  orderStatusEnum,
  updateOrderPricingSchema,
} from '../../../orders/presentation/http/orders.validators';

export const registerPosDeviceSchema = z.object({
  deviceKey: z.string().uuid(),
  label: z.string().trim().max(120).optional(),
});

const offlineCashCompletionSchema = z.object({
  amountReceived: z.number().min(0).optional(),
  changeGiven: z.number().min(0).optional(),
});

const offlineItemAdjustmentSchema = z.object({
  clientItemId: z.string().min(1).max(80),
  menuItemId: z.string().uuid(),
  delta: z.number().int().min(-99).max(99).refine((value) => value !== 0),
});

export const syncOfflineOrderEntrySchema = createOrderObjectSchema
  .extend({
    idempotencyKey: z.string().uuid(),
    deviceKey: z.string().uuid().optional(),
    offlineTicketNumber: z.number().int().min(1).max(99999).optional(),
    offlineTicketLabel: z.string().trim().max(32).optional(),
    completeWithCash: offlineCashCompletionSchema.optional(),
    snapshotLineUnitPrices: z.record(z.string().uuid(), z.string()).optional(),
    itemUpdates: z.array(addOrderItemsSchema).optional(),
    offlineItemAdjustments: z.array(offlineItemAdjustmentSchema).optional(),
    offlinePricingUpdates: z.array(updateOrderPricingSchema).optional(),
    replaySendToKitchen: z.boolean().optional(),
    /** Final non-completed status from the device when the bill is still open locally. */
    offlineOrderStatus: orderStatusEnum.optional(),
  })
  .superRefine((data, ctx) => {
    applyCreateOrderRefinements(data, ctx);
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
