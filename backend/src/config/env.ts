import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  APP_URL: z.string().default('http://localhost:3000'),
  PLATFORM_SUPER_ADMIN_EMAIL: z.string().email().optional(),
  PLATFORM_SUPER_ADMIN_PASSWORD: z.string().min(8).optional(),
  PLATFORM_SUPER_ADMIN_NAME: z.string().default('Super Admin'),
  COS_SECRET_ID: z.string().optional(),
  COS_SECRET_KEY: z.string().optional(),
  COS_REGION: z.string().default('ap-singapore'),
  COS_BUCKET: z.string().optional(),
  COS_PUBLIC_BASE_URL: z.string().url().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_PRESIGN_EXPIRES_SECONDS: z.coerce.number().int().min(60).max(604800).default(604800),
  /** IANA timezone used for daily order ticket resets (e.g. Asia/Karachi). */
  ORDER_DAY_TIMEZONE: z.string().default('Asia/Karachi'),
});

export const env = envSchema.parse(process.env);
