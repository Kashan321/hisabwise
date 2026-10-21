import { PrismaClient } from '@prisma/client';
import { seedRolesAndPermissions } from './seed-data';
import { seedPlatformSuperAdmin } from './seed-platform';

const prisma = new PrismaClient();

async function main() {
  await seedRolesAndPermissions(prisma);
  await seedPlatformSuperAdmin(prisma);
  console.log('Seed completed: system roles, permissions, and platform admin');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
