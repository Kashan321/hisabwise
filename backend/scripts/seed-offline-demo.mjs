import { createHash } from 'crypto';
import { PrismaClient, EmailVerificationPurpose } from '@prisma/client';

const prisma = new PrismaClient();
const SLUG = 'offlinedemo007550';
const EMAIL = 'owner1794403007550@offlinedemo.com';
const OTP = '123456';

async function main() {
  const existing = await prisma.business.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log('tenant exists', SLUG);
    return;
  }

  await prisma.emailVerificationCode.deleteMany({
    where: { email: EMAIL, purpose: EmailVerificationPurpose.REGISTER },
  });
  await prisma.emailVerificationCode.create({
    data: {
      email: EMAIL,
      purpose: EmailVerificationPurpose.REGISTER,
      codeHash: createHash('sha256').update(OTP).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const res = await fetch('http://127.0.0.1:4000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Offline Demo',
      businessSlug: SLUG,
      phone: '03001234567',
      city: 'Karachi',
      restaurantAddress: '123 Main',
      branchNumber: '1',
      name: 'Owner',
      email: EMAIL,
      password: 'password123',
      emailOtp: OTP,
    }),
  });
  const json = await res.json();
  if (!json.success) {
    console.error(json);
    process.exit(1);
  }
  console.log('registered', SLUG);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());