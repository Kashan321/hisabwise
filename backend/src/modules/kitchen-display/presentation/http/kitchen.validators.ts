import { z } from 'zod';

export const listKitchenQueueQuerySchema = z.object({
  status: z.enum(['RECEIVED', 'PREPARING', 'READY']).optional(),
});

export const updateKitchenTicketStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'PREPARING', 'READY', 'CLEARED']),
});
