import { z } from 'zod';

export const cashClosingSettlementSchema = z.enum([
  'KEEP_IN_DRAWER',
  'HANDOVER_TO_OWNER',
  'TRANSFER_TO_WALLET',
  'TRANSFER_TO_BANK',
  'OTHER',
]);

export type CashClosingSettlement = z.infer<typeof cashClosingSettlementSchema>;

export const CLOSING_SETTLEMENT_LABELS: Record<CashClosingSettlement, string> = {
  KEEP_IN_DRAWER: 'Keep cash in drawer',
  HANDOVER_TO_OWNER: 'Cash handover to owner',
  TRANSFER_TO_WALLET: 'Transfer to wallet',
  TRANSFER_TO_BANK: 'Transfer to bank',
  OTHER: 'Other',
};

export const closeCashShiftBodySchema = z
  .object({
    actualCash: z.number().min(0),
    notes: z.string().trim().max(500).optional(),
    closingSettlement: cashClosingSettlementSchema,
    transferredCash: z.number().min(0).optional(),
    destinationAccountId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.transferredCash == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Transferred cash amount is required',
        path: ['transferredCash'],
      });
    }
    if (!data.destinationAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Destination account is required',
        path: ['destinationAccountId'],
      });
    }
  });

export type CloseCashShiftBody = z.infer<typeof closeCashShiftBodySchema>;
