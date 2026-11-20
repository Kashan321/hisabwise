import { useQuery } from '@tanstack/react-query';

import { apiFetch, ApiError } from '@/lib/api/client';
import type {
  CashShift,
  CurrentBusinessDayState,
  MenuCategory,
  Order,
  OrderListFilters,
  OrdersQueryResult,
} from '@/lib/api/types';
import { useTenantQueryEnabled } from '@/lib/auth/AuthContext';
import { canViewBusinessDay } from '@/lib/auth/permissions';
import { useAuth } from '@/lib/auth/AuthContext';

export interface MenuQueryData {
  menu: MenuCategory[];
}

function serializeOrderFilters(filters?: OrderListFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export function useMenu() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['menu'],
    queryFn: () =>
      apiFetch<{ menu?: MenuCategory[]; categories?: MenuCategory[] }>('/menu').then((d) => ({
        menu: d.menu ?? d.categories ?? [],
      })),
    enabled,
    staleTime: 60_000,
  });
}

export type BusinessDayQueryResult =
  | { status: 'loading' }
  | { status: 'ok'; data: CurrentBusinessDayState }
  | { status: 'forbidden'; message: string }
  | { status: 'error'; message: string };

export function useCurrentBusinessDay() {
  const enabled = useTenantQueryEnabled();
  const { user } = useAuth();
  const mayQuery = enabled && canViewBusinessDay(user);

  return useQuery({
    queryKey: ['business-days', 'current'],
    enabled: mayQuery,
    queryFn: async (): Promise<BusinessDayQueryResult> => {
      try {
        const data = await apiFetch<CurrentBusinessDayState>('/business-days/current');
        return {
          status: 'ok',
          data: {
            businessDay: data.businessDay,
            lifecycle: data.lifecycle ?? {},
            currentBusinessDate: data.currentBusinessDate,
          },
        };
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          return { status: 'forbidden', message: e.message };
        }
        if (e instanceof ApiError) {
          return { status: 'error', message: e.message };
        }
        return { status: 'error', message: 'Could not load business day' };
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useCurrentCashShift() {
  const enabled = useTenantQueryEnabled();
  return useQuery({
    queryKey: ['cash-shifts', 'current'],
    queryFn: () => apiFetch<{ shift: CashShift | null }>('/cash-shifts/current').then((d) => d.shift),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useOrders(
  filters?: OrderListFilters,
  options?: { refetchInterval?: number | false },
) {
  const enabled = useTenantQueryEnabled();
  const queryString = serializeOrderFilters(filters);
  return useQuery({
    queryKey: ['orders', 'list', queryString],
    queryFn: () => {
      const q = queryString ? `?${queryString}` : '';
      return apiFetch<OrdersQueryResult>(`/orders${q}`);
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: options?.refetchInterval ?? 20_000,
  });
}

export function useOrder(orderId: string | undefined) {
  const enabled = useTenantQueryEnabled() && !!orderId;
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => apiFetch<{ order: Order }>(`/orders/${orderId}`).then((d) => d.order),
    enabled,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useHeldOrders() {
  return useOrders({
    isDraft: true,
    includeDrafts: true,
    statusGroup: 'active',
    limit: 50,
  });
}