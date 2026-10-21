import { PlatformRole, PrismaClient } from '@prisma/client';
import { Argon2PasswordHasher } from '../src/modules/auth/infrastructure/security/argon2-password-hasher';

export async function seedPlatformSuperAdmin(
  prisma: PrismaClient,
  overrides?: { email?: string; password?: string; name?: string },
) {
  const email = overrides?.email ?? process.env.PLATFORM_SUPER_ADMIN_EMAIL;
  const password = overrides?.password ?? process.env.PLATFORM_SUPER_ADMIN_PASSWORD;
  const name = overrides?.name ?? process.env.PLATFORM_SUPER_ADMIN_NAME ?? 'Super Admin';

  if (!email || !password) {
    console.log('Skipping platform super admin seed (PLATFORM_SUPER_ADMIN_EMAIL/PASSWORD not set)');
    return;
  }

  const passwordHasher = new Argon2PasswordHasher();
  const passwordHash = await passwordHasher.hash(password);
  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.platformUser.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    await prisma.platformUser.update({
      where: { id: existing.id },
      data: {
        name,
        passwordHash,
        role: PlatformRole.SUPER_ADMIN,
        isActive: true,
      },
    });
    console.log(`Platform super admin updated: ${normalizedEmail}`);
    return;
  }

  await prisma.platformUser.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      role: PlatformRole.SUPER_ADMIN,
    },
  });

  console.log(`Platform super admin created: ${normalizedEmail}`);
}
