import { PrismaClient } from '@prisma/client';
import { ensureSystemRolesAndPermissions } from '../src/shared/rbac/system-roles';

export async function seedRolesAndPermissions(prisma: PrismaClient) {
  await ensureSystemRolesAndPermissions(prisma);
}
