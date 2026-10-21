import { z } from 'zod';
import { closeCashShiftBodySchema } from '../../../../shared/cash-shift/closing-settlement';

export const openCashShiftSchema = z.object({
  openingCash: z.number().min(0),
});

export const closeCashShiftSchema = closeCashShiftBodySchema;

export const cashDrawerMovementSchema = z.object({
  type: z.enum(['PAY_IN', 'PAY_OUT']),
  amount: z.number().positive(),
  reason: z.string().trim().min(1).max(500),
});

export const listCashShiftsQuerySchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const confirmRiderCashHandoffSchema = z
  .object({
    settlementId: z.string().uuid().optional(),
    riderId: z.string().uuid().optional(),
  })
  .refine((data) => Boolean(data.settlementId || data.riderId), {
    message: 'Either settlementId or riderId is required',
  });
