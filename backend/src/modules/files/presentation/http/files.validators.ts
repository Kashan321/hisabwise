import { z } from 'zod';

export const storageKeySchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9/_\-.]*$/);

export const storageReferenceSchema = z.union([z.string().url(), storageKeySchema]);

export const uploadFileQuerySchema = z.object({
  folder: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9/_-]+$/, 'folder may only contain letters, numbers, /, _, and -')
    .optional(),
});

export const fileReadUrlQuerySchema = z.object({
  key: storageReferenceSchema,
});
