import { prisma } from '../../../../shared/database/prisma-client';
import { logger } from '../../../../shared/logger/logger';

export async function findActiveUserIdsWithAnyPermission(
  businessId: string,
  permissionKeys: string[],
): Promise<string[]> {
  if (permissionKeys.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { businessId, isActive: true },
    select: {
      id: true,
      userRoles: {
        select: {
          role: {
            select: {
              rolePermissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          },
        },
      },
    },
  });

  const ids: string[] = [];
  for (const user of users) {
    const perms = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        perms.add(rp.permission.key);
      }
    }
    if (perms.has('*') || permissionKeys.some((p) => perms.has(p))) {
      ids.push(user.id);
    }
  }
  return [...new Set(ids)];
}

export async function findActiveUserIdsForBusiness(businessId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { businessId, isActive: true },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/** Resolves notification recipients; falls back to all active staff if RBAC yields nobody. */
export async function resolveNotificationRecipients(
  businessId: string,
  permissionKeys: string[],
): Promise<string[]> {
  const matched = await findActiveUserIdsWithAnyPermission(businessId, permissionKeys);
  if (matched.length > 0) return matched;

  const all = await findActiveUserIdsForBusiness(businessId);
  if (all.length > 0) {
    logger.warn(
      { businessId, permissionKeys },
      'No users matched notification permissions; notifying all active staff',
    );
  }
  return all;
}
