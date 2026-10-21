export const PLATFORM_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
} as const;

export type PlatformRoleName = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

export const PLATFORM_PERMISSIONS = {
  BUSINESSES_VIEW: 'platform.businesses.view',
  BUSINESSES_MANAGE: 'platform.businesses.manage',
  BUSINESSES_DELETE: 'platform.businesses.delete',
  ADMINS_VIEW: 'platform.admins.view',
  ADMINS_MANAGE: 'platform.admins.manage',
  METRICS_VIEW: 'platform.metrics.view',
  AUDIT_VIEW: 'platform.audit.view',
  FEEDBACK_VIEW: 'platform.feedback.view',
  FEEDBACK_MANAGE: 'platform.feedback.manage',
  DEMO_VIEW: 'platform.demo.view',
  DEMO_MANAGE: 'platform.demo.manage',
} as const;

const PLATFORM_ADMIN_PERMISSIONS = [
  PLATFORM_PERMISSIONS.BUSINESSES_VIEW,
  PLATFORM_PERMISSIONS.BUSINESSES_MANAGE,
  PLATFORM_PERMISSIONS.METRICS_VIEW,
  PLATFORM_PERMISSIONS.ADMINS_VIEW,
  PLATFORM_PERMISSIONS.AUDIT_VIEW,
  PLATFORM_PERMISSIONS.FEEDBACK_VIEW,
  PLATFORM_PERMISSIONS.FEEDBACK_MANAGE,
  PLATFORM_PERMISSIONS.DEMO_VIEW,
  PLATFORM_PERMISSIONS.DEMO_MANAGE,
] as const;

export const PLATFORM_AUTH = {
  REFRESH_COOKIE_NAME: 'platform_refresh_token',
} as const;

/** Object storage path segment for platform-wide assets (menu gallery, etc.). */
export const PLATFORM_STORAGE_SCOPE = 'platform';

export function getPlatformPermissions(role: PlatformRoleName): string[] {
  if (role === PLATFORM_ROLES.SUPER_ADMIN) {
    return ['*'];
  }

  return [...PLATFORM_ADMIN_PERMISSIONS];
}

export function hasPlatformPermission(
  permissions: string[],
  required: string,
): boolean {
  return permissions.includes('*') || permissions.includes(required);
}
