import { useAuth } from '@/lib/auth/auth-context';
import {
  canAccessTenantRoute,
  hasAnyPermission,
  hasPermission,
  hasRole,
  isRiderOnly,
  isWaiterOnly,
} from '@/lib/auth/permissions';

export function usePermissions() {
  const { user, isAuthenticated, isReady } = useAuth();

  return {
    user,
    isAuthenticated,
    isReady,
    hasPermission: (permission: string) => hasPermission(user, permission),
    hasAnyPermission: (permissions: string[]) => hasAnyPermission(user, permissions),
    hasRole: (role: string) => hasRole(user, role),
    isWaiterOnly: () => isWaiterOnly(user),
    isRiderOnly: () => isRiderOnly(user),
    canAccessRoute: (slug: string, pathname: string) => canAccessTenantRoute(user, slug, pathname),
  };
}
