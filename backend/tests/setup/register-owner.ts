import { createHash } from 'crypto';
import { EmailVerificationPurpose } from '@prisma/client';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../../src/shared/database/prisma-client';

const TEST_OTP = '123456';

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export async function registerOwner(
  app: Express,
  slug: string,
  overrides?: Partial<{
    businessName: string;
    phone: string;
    name: string;
    email: string;
    password: string;
  }>,
) {
  const email = overrides?.email ?? `owner@${slug}.com`;
  await prisma.emailVerificationCode.deleteMany({
    where: { email, purpose: EmailVerificationPurpose.REGISTER },
  });
  await prisma.emailVerificationCode.create({
    data: {
      email,
      purpose: EmailVerificationPurpose.REGISTER,
      codeHash: hashOtp(TEST_OTP),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  return request(app)
    .post('/api/v1/auth/register')
    .send({
      businessName: overrides?.businessName ?? 'Test Cafe',
      businessSlug: slug,
      phone: overrides?.phone ?? '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main St',
      branchNumber: '1',
      name: overrides?.name ?? 'Owner',
      email,
      password: overrides?.password ?? 'password123',
      emailOtp: TEST_OTP,
    });
}
