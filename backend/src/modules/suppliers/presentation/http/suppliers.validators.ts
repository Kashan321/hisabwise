import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(50).optional(),
  email: z.union([z.string().email().max(200), z.literal('')]).optional(),
  notes: z.string().max(500).optional(),
  openingBalanceOwed: z.number().nonnegative().optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().max(200).nullable().optional().or(z.literal('')),
  notes: z.string().max(500).nullable().optional(),
  openingBalanceOwed: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const recordSupplierPaymentSchema = z.object({
  amount: z.number().positive(),
  paidAt: z.string().datetime().optional(),
  method: z.string().max(50).optional(),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});
