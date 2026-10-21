import { resetDatabase, seedPlatformAdmin, seedSystemRoles } from './test-database';

beforeAll(async () => {
  await seedSystemRoles();
  await seedPlatformAdmin();
});

beforeEach(async () => {
  await resetDatabase();
  await seedSystemRoles();
  await seedPlatformAdmin();
});
