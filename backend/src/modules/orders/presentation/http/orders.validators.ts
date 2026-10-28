import { z } from 'zod';

const orderSourceEnum = z.enum(['QR_CUSTOMER', 'STAFF_ASSISTED', 'ONLINE_DELIVERY']);
const orderTypeEnum = z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR']);
const orderStatusEnum = z.enum(['RECEIVED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']);
const deliveryStatusEnum = z.enum(['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED']);
const changeRequestTypeEnum = z.enum(['CANCEL_ORDER', 'REMOVE_ITEM', 'MODIFY_ITEM']);
export const paymentMethodEnum = z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'WALLET', 'ONLINE', 'OTHER']);
export const orderPaymentStatusEnum = z.enum(['PAID', 'PARTIAL', 'PENDING', 'FAILED']);

const orderPaymentLineSchema = z.object({
  method: paymentMethodEnum,
  amount: z.number().positive(),
  amountReceived: z.number().min(0).optional(),
  changeGiven: z.number().min(0).optional(),
  referenceNumber: z.string().trim().max(64).optional(),
});

const orderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  variantId: z.string().uuid().optional(),
  weightG: z.number().int().min(1).max(20_000).optional(),
  modifierOptionIds: z.array(z.string().uuid()).optional(),
  customizationNotes: z.string().trim().max(500).optional(),
});

const discountTypeEnum = z.enum(['PERCENTAGE', 'FIXED']);

export const createOrderSchema = z
  .object({
    source: orderSourceEnum,
    orderType: orderTypeEnum.optional(),
    tableId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    promotionId: z.string().uuid().optional(),
    discountType: discountTypeEnum.optional(),
    discountValue: z.number().min(0).optional(),
    isDraft: z.boolean().optional(),
    notes: z.string().trim().max(500).optional(),
    customerName: z.string().trim().max(120).optional(),
    customerPhone: z.string().trim().max(32).optional(),
    deliveryAddress: z.string().trim().max(500).optional(),
    deliveryNotes: z.string().trim().max(500).optional(),
    taxRate: z.number().min(0).max(1).optional(),
    serviceRate: z.number().min(0).max(1).optional(),
    items: z.array(orderItemSchema).min(1),
  })
  .superRefine((data, ctx) => {
    if (data.discountType && (data.discountValue == null || data.discountValue <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'discountValue must be greater than 0 when discountType is set',
        path: ['discountValue'],
      });
    }
    if (data.discountType === 'PERCENTAGE' && data.discountValue != null && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage discount cannot exceed 100',
        path: ['discountValue'],
      });
    }
    if (data.promotionId && data.discountType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Use either a promotion or a manual discount, not both',
        path: ['discountType'],
      });
    }
  });

export const addOrderItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  taxRate: z.number().min(0).max(1).optional(),
  serviceRate: z.number().min(0).max(1).optional(),
});

export const updateOrderPricingSchema = z
  .object({
    promotionId: z.string().uuid().nullable().optional(),
    discountType: discountTypeEnum.optional(),
    discountValue: z.number().min(0).optional(),
    taxRate: z.number().min(0).max(1).optional(),
    serviceRate: z.number().min(0).max(1).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discountType && (data.discountValue == null || data.discountValue <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'discountValue must be greater than 0 when discountType is set',
        path: ['discountValue'],
      });
    }
    if (data.discountType === 'PERCENTAGE' && data.discountValue != null && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage discount cannot exceed 100',
        path: ['discountValue'],
      });
    }
    if (data.promotionId && data.discountType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Use either a promotion or a manual discount, not both',
        path: ['discountType'],
      });
    }
  });

export const adjustOrderItemQuantitySchema = z.object({
  delta: z.number().int().min(-99).max(99).refine((value) => value !== 0, {
    message: 'delta must not be zero',
  }),
});

export const updateOrderStatusSchema = z
  .object({
    status: orderStatusEnum,
    paymentMethod: paymentMethodEnum.optional(),
    paymentStatus: orderPaymentStatusEnum.optional(),
    payments: z.array(orderPaymentLineSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'COMPLETED' && !data.paymentMethod && !data.payments?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'paymentMethod or payments is required when completing an order',
        path: ['payments'],
      });
    }
    if (data.status !== 'COMPLETED' && (data.paymentMethod || data.payments || data.paymentStatus)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Payment details can only be set when completing an order',
        path: ['payments'],
      });
    }
  });

export const listOrdersQuerySchema = z.object({
  status: orderStatusEnum.optional(),
  statusGroup: z.enum(['all', 'active', 'completed', 'cancelled']).optional(),
  source: orderSourceEnum.optional(),
  orderType: orderTypeEnum.optional(),
  tableId: z.string().uuid().optional(),
  tableIdentifier: z.string().trim().min(1).max(32).optional(),
  waiterId: z.string().uuid().optional(),
  riderId: z.string().uuid().optional(),
  deliveryStatus: deliveryStatusEnum.optional(),
  isDraft: z.coerce.boolean().optional(),
  includeDrafts: z.coerce.boolean().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateFrom must be YYYY-MM-DD')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateTo must be YYYY-MM-DD')
    .optional(),
  businessDayId: z.string().uuid().optional(),
  cashShiftId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  minTotal: z.coerce.number().min(0).optional(),
  maxTotal: z.coerce.number().min(0).optional(),
}).superRefine((data, ctx) => {
  if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'dateFrom cannot be after dateTo',
      path: ['dateFrom'],
    });
  }
  if (data.minTotal !== undefined && data.maxTotal !== undefined && data.minTotal > data.maxTotal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'minTotal cannot exceed maxTotal',
      path: ['minTotal'],
    });
  }
});

export const assignRiderSchema = z.object({
  riderId: z.string().uuid(),
});

export const updateDeliveryStatusSchema = z
  .object({
    deliveryStatus: deliveryStatusEnum,
    paymentMethod: paymentMethodEnum.optional(),
    paymentStatus: orderPaymentStatusEnum.optional(),
    payments: z.array(orderPaymentLineSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.deliveryStatus !== 'DELIVERED' &&
      (data.paymentMethod || data.payments || data.paymentStatus)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Payment details can only be set when marking a delivery as delivered',
        path: ['payments'],
      });
    }
  });

export const transferWaiterSchema = z.object({
  waiterId: z.string().uuid(),
});

export const transferOrderTableSchema = z.object({
  targetTableId: z.string().uuid(),
});

export const mergeOrdersSchema = z.object({
  sourceOrderId: z.string().uuid(),
});

export const assignTableWaiterSchema = z.object({
  waiterId: z.string().uuid().nullable(),
});

export const createChangeRequestSchema = z.object({
  type: changeRequestTypeEnum,
  reason: z.string().trim().max(500).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const reviewChangeRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().trim().max(500).optional(),
});
