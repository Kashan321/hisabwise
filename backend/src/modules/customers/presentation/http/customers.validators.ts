import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().optional(),
  phoneNumber: z.string().trim().max(30).optional(),
  deliveryAddress: z.string().trim().max(500).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const loyaltyPointsSchema = z.object({
  points: z.number().int().min(1),
  reason: z.string().trim().max(200).optional(),
  orderId: z.string().uuid().optional(),
});

export const listCustomersQuerySchema = z.object({
  search: z.string().trim().optional(),
});
