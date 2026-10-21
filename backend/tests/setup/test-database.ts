import { PrismaClient } from '@prisma/client';
import { BRANDING } from '../../src/config/branding';
import { seedRolesAndPermissions } from '../../prisma/seed-data';
import { seedPlatformSuperAdmin } from '../../prisma/seed-platform';

function databaseName(url: string): string {
  return url.split('/').pop()?.split('?')[0] ?? '';
}

function assertSafeTestDatabase(url: string) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetDatabase can only run when NODE_ENV=test');
  }

  if (process.env.ALLOW_TEST_DB_RESET !== 'true') {
    throw new Error(
      'Database reset is disabled. Tests must load tests/setup/env.ts before resetting data.',
    );
  }

  const dbName = databaseName(url);
  const blocked = new Set([BRANDING.defaultDatabase, 'postgres']);

  if (blocked.has(dbName)) {
    throw new Error(
      `Refusing to wipe protected database "${dbName}". Use TEST_DATABASE_URL=${BRANDING.defaultTestDatabase}.`,
    );
  }

  if (!dbName.includes('test')) {
    throw new Error(
      `Refusing to reset database "${dbName}". Test DB name must include "test".`,
    );
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Check tests/setup/env.ts loaded correctly.');
}

assertSafeTestDatabase(databaseUrl);

const testDatabaseUrl: string = databaseUrl;

export const testPrisma = new PrismaClient({
  datasources: {
    db: { url: testDatabaseUrl },
  },
});

export async function resetDatabase() {
  assertSafeTestDatabase(testDatabaseUrl);

  await testPrisma.userInboxNotification.deleteMany();
  await testPrisma.userNotificationPreference.deleteMany();
  await testPrisma.notificationLog.deleteMany();
  await testPrisma.tenantAuditLog.deleteMany();
  await testPrisma.orderChangeRequest.deleteMany();
  await testPrisma.loyaltyTransaction.deleteMany();
  await testPrisma.reservation.deleteMany();
  await testPrisma.promotion.deleteMany();
  await testPrisma.customerProfile.deleteMany();
  await testPrisma.orderItemModifier.deleteMany();
  await testPrisma.orderItem.deleteMany();
  await testPrisma.order.deleteMany();
  await testPrisma.inventoryMovement.deleteMany();
  await testPrisma.inventoryRecipeLine.deleteMany();
  await testPrisma.inventoryRecipe.deleteMany();
  await testPrisma.menuItemModifierGroup.deleteMany();
  await testPrisma.modifierOption.deleteMany();
  await testPrisma.modifierGroup.deleteMany();
  await testPrisma.menuItem.deleteMany();
  await testPrisma.menuCategory.deleteMany();
  await testPrisma.inventoryItem.deleteMany();
  await testPrisma.floorTable.deleteMany();
  await testPrisma.refreshToken.deleteMany();
  await testPrisma.platformRefreshToken.deleteMany();
  await testPrisma.platformAuditLog.deleteMany();
  await testPrisma.platformUser.deleteMany();
  await testPrisma.userRole.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.business.deleteMany();
}

export async function seedSystemRoles() {
  await seedRolesAndPermissions(testPrisma);
}

export async function seedPlatformAdmin() {
  await seedPlatformSuperAdmin(testPrisma, {
    email: 'super@venta.test',
    password: 'password123',
    name: 'Test Super Admin',
  });
}

export async function disconnectTestDatabase() {
  await testPrisma.$disconnect();
}
