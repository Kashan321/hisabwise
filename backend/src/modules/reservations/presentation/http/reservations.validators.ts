import { z } from 'zod';

const reservationStatusEnum = z.enum([
  'PENDING',
  'CONFIRMED',
  'SEATED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

export const createReservationSchema = z.object({
  tableId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().trim().min(1).max(120),
  customerContact: z.string().trim().max(120).optional(),
  partySize: z.number().int().min(1).max(20).optional(),
  reservationTime: z.coerce.date(),
  notes: z.string().trim().max(500).optional(),
});

export const updateReservationSchema = createReservationSchema.partial();

export const updateReservationStatusSchema = z.object({
  status: reservationStatusEnum,
});

export const listReservationsQuerySchema = z.object({
  date: z.coerce.date().optional(),
  status: reservationStatusEnum.optional(),
});

export const availabilityQuerySchema = z.object({
  date: z.coerce.date(),
  partySize: z.coerce.number().int().min(1).max(20).default(2),
});
