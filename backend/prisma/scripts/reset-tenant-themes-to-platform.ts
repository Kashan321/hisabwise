/**
 * Clears per-tenant theme overrides so all businesses inherit platform admin colors.
 * Run: npx tsx prisma/scripts/reset-tenant-themes-to-platform.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.business.count({
    where: {
      OR: [
        { primaryColor: { not: null } },
        { secondaryColor: { not: null } },
        { backgroundColor: { not: null } },
        { textColor: { not: null } },
      ],
    },
  });

  const result = await prisma.business.updateMany({
    data: {
      primaryColor: null,
      secondaryColor: null,
      backgroundColor: null,
      textColor: null,
    },
  });

  console.log(
    `Cleared theme overrides on ${result.count} business(es) (${before} had at least one custom color).`,
  );
  console.log('Tenants now use colors from Platform settings at runtime.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
