import type { ReactNode } from 'react';

import { hasAnyPermission, hasPermission } from '@/lib/auth/permissions';
import { useAuth } from '@/lib/auth/AuthContext';

export function PermissionGate(props: {
  permission?: string;
  anyOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user } = useAuth();
  const allowed = props.permission
    ? hasPermission(user, props.permission)
    : props.anyOf
      ? hasAnyPermission(user, props.anyOf)
      : true;

  if (!allowed) return props.fallback ?? null;
  return props.children;
}