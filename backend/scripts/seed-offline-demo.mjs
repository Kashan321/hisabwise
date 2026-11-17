import { createHash } from 'crypto';
import { PrismaClient, EmailVerificationPurpose } from '@prisma/client';

const prisma = new PrismaClient();
const SLUG = process.env.E2E_SLUG ?? 'offlinedemo007550';
const EMAIL = process.env.E2E_EMAIL ?? 'owner1794403007550@offlinedemo.com';
const PASSWORD = process.env.E2E_PASSWORD ?? 'password123';
const OTP = '123456';
const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';

async function ensureBurgerMenu(businessId) {
  let category = await prisma.menuCategory.findFirst({
    where: { businessId },
    orderBy: { displayOrder: 'asc' },
  });
  if (!category) {
    category = await prisma.menuCategory.create({
      data: {
        businessId,
        name: 'Mains',
        displayOrder: 0,
      },
    });
  }
  const existing = await prisma.menuItem.findFirst({
    where: { businessId, name: 'Burger' },
  });
  if (existing) {
    console.log('menu item Burger OK');
    return;
  }
  await prisma.menuItem.create({
    data: {
      businessId,
      categoryId: category.id,
      name: 'Burger',
      price: 10,
      displayOrder: 0,
      isAvailable: true,
    },
  });
  console.log('created menu item Burger');
}

async function openBusinessDay(accessToken) {
  const res = await fetch(`${API}/api/v1/business-days/open`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!json.success && !String(json.error?.message ?? '').toLowerCase().includes('already')) {
    throw new Error(`open business day: ${JSON.stringify(json)}`);
  }
}

async function login() {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const json = await res.json();
  if (!json.success) return null;
  return json.data;
}

async function registerTenant() {
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

  const res = await fetch(`${API}/api/v1/auth/register`, {
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
      password: PASSWORD,
      emailOtp: OTP,
    }),
  });
  const json = await res.json();
  if (!json.success) {
    console.error(json);
    process.exit(1);
  }
  console.log('registered', SLUG);
  return json.data.user.businessId;
}

async function main() {
  let business = await prisma.business.findUnique({ where: { slug: SLUG } });
  if (!business) {
    const businessId = await registerTenant();
    business = await prisma.business.findUnique({ where: { id: businessId } });
  } else {
    console.log('tenant exists', SLUG);
  }
  if (!business) throw new Error('business missing after seed');

  await ensureBurgerMenu(business.id);

  const session = await login();
  if (!session?.accessToken) {
    throw new Error(`Could not login as ${EMAIL} — reset password or re-run register`);
  }
  await openBusinessDay(session.accessToken);
  console.log('E2E tenant ready:', SLUG, EMAIL);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());