import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const adminUrl =
  process.env.TEST_DATABASE_ADMIN_URL ??
  'postgresql://postgres:1234@localhost:5432/postgres';
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error('TEST_DATABASE_URL is not set in .env');
}

const dbName = testUrl.split('/').pop()?.split('?')[0] ?? '';
if (!dbName) throw new Error('Could not parse database name from TEST_DATABASE_URL');

async function main() {
  const admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database "${dbName}".`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('already exists')) {
      console.log(`Database "${dbName}" already exists.`);
    } else {
      throw error;
    }
  } finally {
    await admin.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
