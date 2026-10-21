import { config } from 'dotenv';
import { resolve } from 'path';
import { BRANDING } from '../../src/config/branding';

process.env.NODE_ENV = 'test';

// Read from .env file directly so a shell DATABASE_URL override cannot break isolation.
const envFile = config({ path: resolve(__dirname, '../../.env') });

const devDatabaseUrl = envFile.parsed?.DATABASE_URL;
const testDatabaseUrl = envFile.parsed?.TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    `TEST_DATABASE_URL must be set in .env (use a separate database, e.g. ${BRANDING.defaultTestDatabase}). ` +
      'Tests must never run against your dev database.',
  );
}

if (!devDatabaseUrl) {
  throw new Error('DATABASE_URL must be set in .env for dev configuration.');
}

if (devDatabaseUrl === testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL must be different from DATABASE_URL. ' +
      'Use a dedicated test database so dev data is never wiped.',
  );
}

function databaseName(url: string): string {
  return url.split('/').pop()?.split('?')[0] ?? '';
}

const devDbName = databaseName(devDatabaseUrl);
const testDbName = databaseName(testDatabaseUrl);

const blockedDevDatabases = new Set([BRANDING.defaultDatabase, 'postgres']);

if (testDbName === devDbName) {
  throw new Error(
    `Test database name "${testDbName}" matches dev database. Use a separate test database.`,
  );
}

if (!testDbName.includes('test')) {
  throw new Error(
    `Test database "${testDbName}" must include "test" in its name (e.g. ${BRANDING.defaultTestDatabase}).`,
  );
}

if (blockedDevDatabases.has(testDbName)) {
  throw new Error(
    `Refusing to run tests against protected database "${testDbName}". ` +
      `Use a dedicated test database like ${BRANDING.defaultTestDatabase}.`,
  );
}

// Point all test code (app, prisma) at the isolated test database only.
process.env.DATABASE_URL = testDatabaseUrl;
process.env.ALLOW_TEST_DB_RESET = 'true';
