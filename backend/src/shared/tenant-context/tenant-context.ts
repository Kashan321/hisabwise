import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  userId: string;
  businessId: string;
  roles: string[];
  permissions: string[];
  userName?: string;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
  return tenantStorage.run(context, fn);
}

/** Preserves tenant context across `await` in event listeners and background jobs. */
export function runWithTenantContextAsync<T>(
  context: TenantContext,
  fn: () => Promise<T>,
): Promise<T> {
  return tenantStorage.run(context, fn);
}

export function getTenantContext(): TenantContext {
  const context = tenantStorage.getStore();
  if (!context) {
    throw new Error('Tenant context is not available');
  }
  return context;
}

export function getOptionalTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

export function hasPermission(permission: string): boolean {
  const context = getTenantContext();
  return context.permissions.includes('*') || context.permissions.includes(permission);
}
