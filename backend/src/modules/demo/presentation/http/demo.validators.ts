import { z } from 'zod';

export const createDemoRequestSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  company: z.string().max(120).optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
  eventName: z.string().max(200).optional().nullable(),
  calendlyInviteeUri: z.string().url().optional().nullable(),
  source: z.enum(['CALENDLY', 'MANUAL']).optional(),
});

export const listPlatformDemoQuerySchema = z.object({
  status: z.enum(['PENDING', 'SCHEDULED', 'CONTACTED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const updateDemoRequestStatusSchema = z.object({
  status: z.enum(['PENDING', 'SCHEDULED', 'CONTACTED', 'COMPLETED', 'CANCELLED']),
  adminNote: z.string().max(2000).optional(),
});
