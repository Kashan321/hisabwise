import { z } from 'zod';

export const storageKeySchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9/_\-.]*$/);

export const storageReferenceSchema = z.union([z.string().url(), storageKeySchema]);

export const nullableStorageReferenceSchema = storageReferenceSchema.nullable();
