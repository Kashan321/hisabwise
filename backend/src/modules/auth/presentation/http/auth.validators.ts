import { z } from 'zod';
import { PASSWORD } from '../../../../config/constants';
import {
  isValidPakistaniPhone,
  normalizePakistaniPhone,
  PAKISTANI_PHONE_MESSAGE,
} from '../../../../shared/validation/pakistani-phone';
export const registerSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  businessSlug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  phone: z
    .string()
    .trim()
    .transform(normalizePakistaniPhone)
    .refine(isValidPakistaniPhone, PAKISTANI_PHONE_MESSAGE),
  city: z.string().trim().min(2).max(100),
  restaurantAddress: z.string().trim().min(5).max(255),
  branchNumber: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(PASSWORD.MIN_LENGTH),
  primaryColor: z.string().trim().max(32).optional(),
  secondaryColor: z.string().trim().max(32).optional(),
  backgroundColor: z.string().trim().max(32).optional(),
  textColor: z.string().trim().max(32).optional(),
});

export const loginSchema = z.object({
  businessSlug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
    .optional(),
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
