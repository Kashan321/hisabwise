import type { AuthUser } from '@/lib/api/types';

export function hasPermission(user: AuthUser | null | undefined, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes('*') || user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

export function canCreateOrders(user: AuthUser | null | undefined): boolean {
  return hasAnyPermission(user, ['orders.create', 'orders.serve', 'orders.manage']);
}

export function canViewOrders(user: AuthUser | null | undefined): boolean {
  return hasAnyPermission(user, ['orders.view', 'orders.serve', 'orders.manage', 'kitchen.manage']);
}

export function canManageOrders(user: AuthUser | null | undefined): boolean {
  return hasAnyPermission(user, ['orders.manage', 'kitchen.manage']);
}

export function canViewBusinessDay(user: AuthUser | null | undefined): boolean {
  return hasAnyPermission(user, ['reports.view', 'orders.manage', 'business.manage']);
}

export function canViewCashShift(user: AuthUser | null | undefined): boolean {
  return hasAnyPermission(user, ['cash.shift', 'orders.manage', 'orders.view']);
}