import { PrismaClient } from '@prisma/client';
import { BRANDING } from '../src/config/branding';

const admin = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:1234@localhost:5432/postgres' } },
});

const testDbName = BRANDING.defaultTestDatabase;

async function main() {
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`);
    console.log(`Created database ${testDbName}`);
  } catch (error: unknown) {
    const message =
      typeof error === 'object' && error !== null && 'meta' in error
        ? (error as { meta?: { message?: string } }).meta?.message
        : error instanceof Error
          ? error.message
          : String(error);

    if (message?.includes('already exists')) {
      console.log(`Database ${testDbName} already exists`);
      return;
    }

    throw error;
  }
}

main()
  .finally(() => admin.$disconnect());
