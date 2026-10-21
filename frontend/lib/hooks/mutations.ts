import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch, getPlatformToken, getTenantToken } from '@/lib/api/client';
import { API_BASE_URL } from '@/lib/config';
import {
  patchBusinessInCache,
  patchFloorTableInCache,
  patchMenuItemInCache,
  patchOrderInCache,
  patchPromotionInCache,
  reconcileInBackground,
  removeOrderFromLiveQueues,
  replaceOrderInCache,
  restoreSnapshots,
  snapshotQueries,
} from '@/lib/hooks/mutation-cache';
import type {
  Business,
  Customer,
  FloorElement,
  FloorPlan,
  FloorTable,
  MenuCategory,
  MenuItem,
  MenuItemVariant,
  ModifierGroup,
  Order,
  StaffMember,
  TableShape,
  FloorElementType,
  InventoryItem,
  Reservation,
} from '@/lib/api/types';
function invalidateMenu(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['menu'] });
  qc.invalidateQueries({ queryKey: ['menu', 'modifier-groups'] });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; displayOrder?: number }) =>
      apiFetch<{ category: MenuCategory }>('/menu/categories', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/menu/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      categoryId: string;
      name: string;
      description?: string;
      price: string;
      basePrice?: string;
      imageUrl?: string;
    }) =>
      apiFetch<{ item: MenuItem }>('/menu/items', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      isAvailable?: boolean;
      price?: string;
      basePrice?: string | null;
      name?: string;
      description?: string;
      imageUrl?: string | null;
      categoryId?: string;
    }) =>
      apiFetch<{ item: MenuItem }>(`/menu/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ['menu'] });
      const snapshots = snapshotQueries(qc, ['menu']);
      patchMenuItemInCache(qc, id, patch);
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: (data) => {
      patchMenuItemInCache(qc, data.item.id, data.item);
      reconcileInBackground(qc, ['menu']);
    },
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/menu/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useCreateModifierGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      isRequired?: boolean;
      minSelect?: number;
      maxSelect?: number;
    }) =>
      apiFetch<{ modifierGroup: ModifierGroup }>('/menu/modifier-groups', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useUpdateModifierGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      isRequired?: boolean;
      minSelect?: number;
      maxSelect?: number;
    }) =>
      apiFetch<{ modifierGroup: ModifierGroup }>(`/menu/modifier-groups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useDeleteModifierGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/menu/modifier-groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useCreateModifierOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      ...body
    }: {
      groupId: string;
      name: string;
      priceAdjustment?: string;
      displayOrder?: number;
    }) =>
      apiFetch<{ modifierOption: ModifierGroup['options'][number] }>(
        `/menu/modifier-groups/${groupId}/options`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      ),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useUpdateModifierOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      priceAdjustment?: string;
      isAvailable?: boolean;
      displayOrder?: number;
    }) =>
      apiFetch<{ modifierOption: ModifierGroup['options'][number] }>(
        `/menu/modifier-options/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body),
        },
      ),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useDeleteModifierOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/menu/modifier-options/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useLinkModifierGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, modifierGroupId }: { itemId: string; modifierGroupId: string }) =>
      apiFetch(`/menu/items/${itemId}/modifier-groups`, {
        method: 'POST',
        body: JSON.stringify({ modifierGroupId }),
      }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useUnlinkModifierGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, groupId }: { itemId: string; groupId: string }) =>
      apiFetch(`/menu/items/${itemId}/modifier-groups/${groupId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useCreateMenuItemVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      ...body
    }: {
      itemId: string;
      name: string;
      price: string;
      basePrice?: string;
      displayOrder?: number;
    }) =>
      apiFetch<{ variant: MenuItemVariant }>(`/menu/items/${itemId}/variants`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useUpdateMenuItemVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      price?: string;
      basePrice?: string | null;
      isAvailable?: boolean;
      displayOrder?: number;
    }) =>
      apiFetch<{ variant: MenuItemVariant }>(`/menu/variants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useDeleteMenuItemVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/menu/variants/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMenu(qc),
  });
}

export function useDownloadMenuSampleCsv() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ csv: string; filename: string }>('/menu/import/sample'),
  });
}

export function useImportMenuCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const token = getTenantToken();
      const response = await fetch(`${API_BASE_URL}/menu/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include',
      });

      const json = (await response.json()) as {
        success: boolean;
        data?: {
          import: {
            categoriesCreated: number;
            itemsCreated: number;
            variantsCreated: number;
            modifierGroupsCreated: number;
            modifierOptionsCreated: number;
            linksCreated: number;
          };
        };
        error?: { code: string; message: string; details?: { errors?: Array<{ lineNumber: number; message: string }> } };
      };

      if (!response.ok || !json.success) {
        const { ApiError } = await import('@/lib/api/client');
        throw new ApiError(
          json.error?.code ?? 'UNKNOWN',
          json.error?.message ?? 'Import failed',
          response.status,
          json.error?.details,
        );
      }

      return json.data!;
    },
    onSuccess: () => invalidateMenu(qc),
  });
}

function invalidateFloorPlan(qc: ReturnType<typeof useQueryClient>, planId?: string) {
  qc.invalidateQueries({ queryKey: ['floor-plan', 'plans'] });
  qc.invalidateQueries({ queryKey: ['floor-plan', 'tables'] });
  if (planId) {
    qc.invalidateQueries({ queryKey: ['floor-plan', 'scene', planId] });
  } else {
    qc.invalidateQueries({ queryKey: ['floor-plan', 'scene'] });
  }
}

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      floorPlanId?: string;
      tableIdentifier: string;
      layoutX: number;
      layoutY: number;
      capacity?: number;
      width?: number;
      height?: number;
      shape?: TableShape;
      rotation?: number;
    }) =>
      apiFetch<{ table: FloorTable }>('/floor-plan/tables', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => invalidateFloorPlan(qc, vars.floorPlanId),
  });
}

export function useUpdateTableStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FloorTable['status'] }) =>
      apiFetch<{ table: FloorTable }>(`/floor-plan/tables/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['floor-plan', 'tables'] });
      const snapshots = snapshotQueries(qc, ['floor-plan', 'tables']);
      patchFloorTableInCache(qc, id, { status });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: (data) => {
      patchFloorTableInCache(qc, data.table.id, data.table);
      invalidateFloorPlan(qc);
    },
  });
}

export function useUpdateTableLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      layoutX,
      layoutY,
      width,
      height,
      shape,
      rotation,
      floorPlanId,
    }: {
      id: string;
      layoutX?: number;
      layoutY?: number;
      width?: number;
      height?: number;
      shape?: TableShape;
      rotation?: number;
      floorPlanId?: string;
    }) =>
      apiFetch<{ table: FloorTable }>(`/floor-plan/tables/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ layoutX, layoutY, width, height, shape, rotation }),
      }),
    onSuccess: (_, vars) => invalidateFloorPlan(qc, vars.floorPlanId),
  });
}

export function useDeleteTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; floorPlanId?: string }) =>
      apiFetch(`/floor-plan/tables/${id}`, { method: 'DELETE' }),
    onSuccess: (_, vars) => invalidateFloorPlan(qc, vars.floorPlanId),
  });
}

export function useCreateFloorPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; level?: number; width: number; height: number }) =>
      apiFetch<{ plan: FloorPlan }>('/floor-plan/plans', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateFloorPlan(qc),
  });
}

export function useUpdateFloorPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      level?: number;
      width?: number;
      height?: number;
    }) =>
      apiFetch<{ plan: FloorPlan }>(`/floor-plan/plans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => invalidateFloorPlan(qc, vars.id),
  });
}

export function useDeleteFloorPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/floor-plan/plans/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateFloorPlan(qc),
  });
}

export function useCreateFloorElement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      ...body
    }: {
      planId: string;
      type: FloorElementType;
      layoutX: number;
      layoutY: number;
      width: number;
      height: number;
      rotation?: number;
      options?: Record<string, unknown>;
    }) =>
      apiFetch<{ element: FloorElement }>(`/floor-plan/plans/${planId}/elements`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => invalidateFloorPlan(qc, vars.planId),
  });
}

export function useUpdateFloorElement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      floorPlanId,
      ...body
    }: {
      id: string;
      floorPlanId?: string;
      layoutX?: number;
      layoutY?: number;
      width?: number;
      height?: number;
      rotation?: number;
      options?: Record<string, unknown>;
    }) =>
      apiFetch<{ element: FloorElement }>(`/floor-plan/elements/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, vars) => invalidateFloorPlan(qc, vars.floorPlanId),
  });
}

export function useDeleteFloorElement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, floorPlanId }: { id: string; floorPlanId?: string }) =>
      apiFetch(`/floor-plan/elements/${id}`, { method: 'DELETE' }),
    onSuccess: (_, vars) => invalidateFloorPlan(qc, vars.floorPlanId),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      email: string;
      password: string;
      roleName: 'owner' | 'manager' | 'employee' | 'chef' | 'waiter' | 'rider';
    }) =>
      apiFetch<{ staff: StaffMember }>('/staff', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      roleName?: 'owner' | 'manager' | 'employee' | 'chef' | 'waiter' | 'rider';
      password?: string;
    }) =>
      apiFetch<{ staff: StaffMember }>(`/staff/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/staff/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useUpdateStaffStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch<{ staff: StaffMember }>(`/staff/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: ['staff'] });
      const snapshots = snapshotQueries(qc, ['staff']);
      qc.setQueriesData<StaffMember[]>({ queryKey: ['staff'] }, (old) => {
        if (!old) return old;
        return old.map((member) =>
          member.id === id ? { ...member, isActive } : member,
        );
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: () => reconcileInBackground(qc, ['staff']),
  });
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      location?: string | null;
      city?: string | null;
      branchNumber?: string | null;
      phone?: string | null;
      logoUrl?: string | null;
      primaryColor?: string | null;
      secondaryColor?: string | null;
      backgroundColor?: string | null;
      textColor?: string | null;
      currency?: string | null;
      allowNegativeInventory?: boolean;
      defaultTaxRate?: number;
      defaultDeliveryCharge?: number;
      orderTicketPrefix?: string;
      orderTicketResetDaily?: boolean;
      businessDayStartTime?: string;
      businessDayTimezone?: string;
      businessDayAutoCloseEnabled?: boolean;
      businessDayCloseReminderEnabled?: boolean;
    }) =>
      apiFetch<{ business: Business }>('/business/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ['business', 'me'] });
      const prev = qc.getQueryData<Business>(['business', 'me']);
      patchBusinessInCache(qc, body);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['business', 'me'], ctx.prev);
    },
    onSuccess: (data) => {
      qc.setQueryData(['business', 'me'], data.business);
      reconcileInBackground(qc, ['business']);
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      source: 'STAFF_ASSISTED';
      orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
      tableId?: string;
      customerId?: string;
      promotionId?: string;
      discountType?: 'PERCENTAGE' | 'FIXED';
      discountValue?: number;
      taxRate?: number;
      serviceRate?: number;
      notes?: string;
      customerName?: string;
      customerPhone?: string;
      deliveryAddress?: string;
      deliveryNotes?: string;
      isDraft?: boolean;
      items: {
        menuItemId: string;
        quantity: number;
        variantId?: string;
        modifierOptionIds?: string[];
      }[];
    }) =>
      apiFetch<{ order: Order }>('/orders', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      replaceOrderInCache(qc, data.order);
      reconcileInBackground(qc, ['orders']);
      reconcileInBackground(qc, ['kitchen', 'queue']);
      reconcileInBackground(qc, ['waiter']);
      reconcileInBackground(qc, ['delivery']);
    },
  });
}

export function useSendOrderToKitchen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      apiFetch<{ order: Order }>(`/orders/${orderId}/send-to-kitchen`, {
        method: 'POST',
      }),
    onMutate: async (orderId) => {
      await qc.cancelQueries({ queryKey: ['waiter', 'orders'] });
      const snapshots = snapshotQueries(qc, ['waiter', 'orders']);
      patchOrderInCache(qc, orderId, { isDraft: false, sentToKitchenAt: new Date().toISOString() });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: (data) => {
      replaceOrderInCache(qc, data.order);
      reconcileInBackground(qc, ['orders']);
      reconcileInBackground(qc, ['waiter']);
      reconcileInBackground(qc, ['kitchen', 'queue']);
    },
  });
}

export function useAddOrderItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      items,
      taxRate,
      serviceRate,
    }: {
      orderId: string;
      items: {
        menuItemId: string;
        quantity: number;
        variantId?: string;
        modifierOptionIds?: string[];
      }[];
      taxRate?: number;
      serviceRate?: number;
    }) =>
      apiFetch<{ order: Order }>(`/orders/${orderId}/items`, {
        method: 'POST',
        body: JSON.stringify({ items, taxRate, serviceRate }),
      }),
    onSuccess: (data) => {
      replaceOrderInCache(qc, data.order);
      qc.invalidateQueries({ queryKey: ['orders', data.order.id] });
      reconcileInBackground(qc, ['orders']);
      reconcileInBackground(qc, ['waiter']);
      reconcileInBackground(qc, ['kitchen', 'queue']);
    },
  });
}

export function useAdjustOrderItemQuantity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      orderItemId,
      delta,
    }: {
      orderId: string;
      orderItemId: string;
      delta: number;
    }) =>
      apiFetch<{ order: Order }>(`/orders/${orderId}/items/${orderItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ delta }),
      }),
    onSuccess: (data) => {
      replaceOrderInCache(qc, data.order);
      qc.invalidateQueries({ queryKey: ['orders', data.order.id] });
      reconcileInBackground(qc, ['orders']);
      reconcileInBackground(qc, ['waiter']);
      reconcileInBackground(qc, ['kitchen', 'queue']);
    },
  });
}

export function useCreateChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      type,
      reason,
      orderItemId,
    }: {
      orderId: string;
      type: 'CANCEL_ORDER' | 'REMOVE_ITEM' | 'MODIFY_ITEM';
      reason?: string;
      orderItemId?: string;
    }) =>
      apiFetch<{ changeRequest: import('@/lib/api/types').OrderChangeRequest }>(
        `/orders/${orderId}/change-requests`,
        {
          method: 'POST',
          body: JSON.stringify({ type, reason, orderItemId }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['waiter'] });
    },
  });
}

export function useAssignRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, riderId }: { orderId: string; riderId: string }) =>
      apiFetch<{ order: Order }>(`/delivery/orders/${orderId}/assign-rider`, {
        method: 'POST',
        body: JSON.stringify({ riderId }),
      }),
    onMutate: async ({ orderId, riderId }) => {
      await qc.cancelQueries({ queryKey: ['delivery', 'orders'] });
      const snapshots = snapshotQueries(qc, ['delivery', 'orders']);
      patchOrderInCache(qc, orderId, { riderId, deliveryStatus: 'ASSIGNED' });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: (data) => {
      replaceOrderInCache(qc, data.order);
      reconcileInBackground(qc, ['delivery', 'orders']);
      reconcileInBackground(qc, ['orders']);
      reconcileInBackground(qc, ['rider']);
    },
  });
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      deliveryStatus,
      paymentMethod,
      paymentStatus,
      payments,
    }: {
      orderId: string;
      deliveryStatus: 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
      paymentMethod?: string;
      paymentStatus?: string;
      payments?: Array<{
        method: string;
        amount: number;
        amountReceived?: number;
        changeGiven?: number;
        referenceNumber?: string;
      }>;
    }) =>
      apiFetch<{ order: Order }>(`/rider/deliveries/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          deliveryStatus,
          ...(deliveryStatus === 'DELIVERED'
            ? { paymentMethod, paymentStatus, payments }
            : {}),
        }),
      }),
    onMutate: async ({ orderId, deliveryStatus, paymentMethod, paymentStatus }) => {
      await qc.cancelQueries({ queryKey: ['rider'] });
      const snapshots = snapshotQueries(qc, ['rider']);
      patchOrderInCache(qc, orderId, { deliveryStatus });
      if (deliveryStatus === 'DELIVERED') {
        patchOrderInCache(qc, orderId, {
          status: 'COMPLETED',
          ...(paymentMethod ? { paymentMethod } : {}),
          ...(paymentStatus ? { paymentStatus } : {}),
        });
        removeOrderFromLiveQueues(qc, orderId);
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: (data, vars) => {
      replaceOrderInCache(qc, data.order);
      reconcileInBackground(qc, ['rider']);
      reconcileInBackground(qc, ['delivery']);
      reconcileInBackground(qc, ['orders']);
      if (vars.deliveryStatus === 'DELIVERED') {
        qc.invalidateQueries({ queryKey: ['rider', 'cash-pending'] });
        qc.invalidateQueries({ queryKey: ['cash-shifts', 'rider-handoffs', 'pending'] });
      }
    },
  });
}

function applyOrderStatusOptimistic(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  status: string,
  paymentMethod?: string,
  paymentStatus?: string,
) {
  const patch: Partial<Order> = { status };
  if (paymentMethod) patch.paymentMethod = paymentMethod;
  if (paymentStatus) patch.paymentStatus = paymentStatus;
  patchOrderInCache(qc, id, patch);
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    removeOrderFromLiveQueues(qc, id);
  }
}

type CompleteOrderVars = {
  id: string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  payments?: Array<{
    method: string;
    amount: number;
    amountReceived?: number;
    changeGiven?: number;
    referenceNumber?: string;
  }>;
};

function buildStatusBody(vars: CompleteOrderVars) {
  const { status, paymentMethod, paymentStatus, payments } = vars;
  return {
    status,
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(payments?.length ? { payments } : {}),
  };
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: CompleteOrderVars) =>
      apiFetch<{ order: Order }>(`/orders/${vars.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(buildStatusBody(vars)),
      }),
    onMutate: async ({ id, status, paymentMethod, paymentStatus }) => {
      await qc.cancelQueries({ queryKey: ['orders'] });
      const snapshots = [
        ...snapshotQueries(qc, ['orders', 'list']),
        ...snapshotQueries(qc, ['kitchen', 'queue']),
      ];
      applyOrderStatusOptimistic(qc, id, status, paymentMethod, paymentStatus);
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: (data) => {
      replaceOrderInCache(qc, data.order);
      reconcileInBackground(qc, ['orders']);
      reconcileInBackground(qc, ['kitchen', 'queue']);
    },
  });
}

function applyKitchenTicketOptimistic(
  qc: ReturnType<typeof useQueryClient>,
  ticketId: string,
  status: string,
) {
  if (status === 'CLEARED') {
    qc.setQueriesData<Order[]>({ queryKey: ['kitchen', 'queue'] }, (old) =>
      old ? old.filter((ticket) => ticket.id !== ticketId) : old,
    );
    return;
  }

  qc.setQueriesData<Order[]>({ queryKey: ['kitchen', 'queue'] }, (old) =>
    old?.map((ticket) => (ticket.id === ticketId ? { ...ticket, status } : ticket)) ?? old,
  );
}

export function useUpdateKitchenOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: CompleteOrderVars) =>
      apiFetch<{ order: Order }>(`/kitchen/tickets/${vars.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: vars.status }),
      }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['kitchen', 'queue'] });
      const snapshots = [...snapshotQueries(qc, ['kitchen', 'queue'])];
      applyKitchenTicketOptimistic(qc, id, status);
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: () => {
      reconcileInBackground(qc, ['kitchen', 'queue']);
      reconcileInBackground(qc, ['orders']);
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      email?: string;
      phoneNumber?: string;
      deliveryAddress?: string;
    }) =>
      apiFetch<{ customer: Customer }>('/customers', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      email?: string | null;
      phoneNumber?: string | null;
      deliveryAddress?: string | null;
    }) =>
      apiFetch<{ customer: Customer }>(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useCreatePublicOrder(slug: string) {
  return useMutation({
    mutationFn: (body: {
      tableId?: string;
      items: {
        menuItemId: string;
        quantity: number;
        variantId?: string;
        modifierOptionIds?: string[];
      }[];
      notes?: string;
    }) =>
      apiFetch<{ order: Order }>(`/public/${slug}/orders`, {
        method: 'POST',
        auth: 'none',
        body: JSON.stringify(body),
      }),
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      customerName: string;
      customerContact?: string;
      partySize?: number;
      reservationTime: string;
      tableId?: string;
      notes?: string;
    }) =>
      apiFetch<{ reservation: import('@/lib/api/types').Reservation }>('/reservations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
}

export function useUpdateReservationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['reservations'] });
      const snapshots = snapshotQueries(qc, ['reservations']);
      qc.setQueriesData<Reservation[]>({ queryKey: ['reservations'] }, (old) => {
        if (!old) return old;
        return old.map((reservation) =>
          reservation.id === id ? { ...reservation, status } : reservation,
        );
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: () => reconcileInBackground(qc, ['reservations']),
  });
}

export function useCreatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      description?: string;
      discountType: 'PERCENTAGE' | 'FIXED';
      discountValue: number;
      startDate: string;
      endDate: string;
    }) =>
      apiFetch<{ promotion: import('@/lib/api/types').Promotion }>('/promotions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  });
}

export function useTogglePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      apiFetch(`/promotions/${id}/${activate ? 'activate' : 'deactivate'}`, {
        method: 'PATCH',
      }),
    onMutate: async ({ id, activate }) => {
      await qc.cancelQueries({ queryKey: ['promotions'] });
      const snapshots = snapshotQueries(qc, ['promotions']);
      patchPromotionInCache(qc, id, { isActive: activate });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: () => reconcileInBackground(qc, ['promotions']),
  });
}

export function useSuspendBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/platform/businesses/${id}/suspend`, { method: 'POST', auth: 'platform' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      qc.invalidateQueries({ queryKey: ['platform', 'metrics'] });
    },
  });
}

export function useReactivateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/platform/businesses/${id}/reactivate`, { method: 'POST', auth: 'platform' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      qc.invalidateQueries({ queryKey: ['platform', 'metrics'] });
    },
  });
}

export function useCreateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      businessName: string;
      businessSlug: string;
      ownerName: string;
      ownerEmail: string;
      ownerPassword: string;
      subscriptionStatus?: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIAL';
      trialDays?: number;
      primaryColor?: string;
      secondaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
    }) =>
      apiFetch<{ business: import('@/lib/api/types').PlatformBusiness }>('/platform/businesses', {
        method: 'POST',
        auth: 'platform',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      qc.invalidateQueries({ queryKey: ['platform', 'metrics'] });
    },
  });
}

export function useUpdateBusinessSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      subscriptionStatus,
    }: {
      id: string;
      subscriptionStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIAL';
    }) =>
      apiFetch<{ business: import('@/lib/api/types').PlatformBusiness }>(
        `/platform/businesses/${id}/subscription`,
        {
          method: 'PATCH',
          auth: 'platform',
          body: JSON.stringify({ subscriptionStatus }),
        },
      ),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      qc.invalidateQueries({ queryKey: ['platform', 'businesses', id] });
      qc.invalidateQueries({ queryKey: ['platform', 'metrics'] });
    },
  });
}

export function useDeleteBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/platform/businesses/${id}`, { method: 'DELETE', auth: 'platform' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      qc.invalidateQueries({ queryKey: ['platform', 'metrics'] });
    },
  });
}

export function useCreatePlatformAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      email: string;
      password: string;
      role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN';
    }) =>
      apiFetch<{ admin: import('@/lib/api/types').PlatformUser }>('/platform/admins', {
        method: 'POST',
        auth: 'platform',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'admins'] }),
  });
}

export function useUpdatePlatformAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      role?: 'SUPER_ADMIN' | 'PLATFORM_ADMIN';
      isActive?: boolean;
    }) =>
      apiFetch<{ admin: import('@/lib/api/types').PlatformUser }>(`/platform/admins/${id}`, {
        method: 'PATCH',
        auth: 'platform',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'admins'] }),
  });
}

export function useExportReportInvoices() {
  return useMutation({
    mutationFn: (range: { from?: string; to?: string }) => {
      const params = new URLSearchParams();
      if (range.from) params.set('from', range.from);
      if (range.to) params.set('to', range.to);
      const q = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ csv: string; filename: string }>(`/reports/invoices/export${q}`);
    },
  });
}

export function useExportAnalyticsReport() {
  return useMutation({
    mutationFn: ({
      type,
      filters,
    }: {
      type: string;
      filters: import('@/lib/api/types').ReportFilters;
    }) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value != null && value !== '') params.set(key, String(value));
      }
      const q = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ csv: string; filename: string }>(`/reports/export/${type}${q}`);
    },
  });
}

export function useUploadFile() {
  return useMutation({
    mutationFn: ({
      file,
      folder,
      auth,
    }: {
      file: File;
      folder?: string;
      auth?: 'tenant' | 'platform';
    }) =>
      import('@/lib/api/upload').then(({ uploadFile }) =>
        uploadFile(file, { folder, auth: auth ?? 'tenant' }),
      ),
  });
}

export function useCreateMenuGalleryImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      label: string;
      searchTerms?: string | null;
      imageUrl: string;
      displayOrder?: number;
      isActive?: boolean;
    }) =>
      apiFetch<{ image: import('@/lib/api/types').MenuGalleryImage }>('/platform/menu-gallery', {
        method: 'POST',
        auth: 'platform',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'menu-gallery'] });
      qc.invalidateQueries({ queryKey: ['menu', 'gallery-images'] });
    },
  });
}

export function useUpdateMenuGalleryImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      label?: string;
      searchTerms?: string | null;
      imageUrl?: string;
      displayOrder?: number;
      isActive?: boolean;
    }) =>
      apiFetch<{ image: import('@/lib/api/types').MenuGalleryImage }>(
        `/platform/menu-gallery/${id}`,
        { method: 'PATCH', auth: 'platform', body: JSON.stringify(body) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'menu-gallery'] });
      qc.invalidateQueries({ queryKey: ['menu', 'gallery-images'] });
    },
  });
}

export function useDeleteMenuGalleryImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ message: string }>(`/platform/menu-gallery/${id}`, {
        method: 'DELETE',
        auth: 'platform',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'menu-gallery'] });
      qc.invalidateQueries({ queryKey: ['menu', 'gallery-images'] });
    },
  });
}

export function useDownloadMenuGallerySampleCsv() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ csv: string; filename: string }>('/platform/menu-gallery/import/sample', {
        auth: 'platform',
      }),
  });
}

async function importMenuGalleryCsvResponse(response: Response) {
  const json = (await response.json()) as {
    success: boolean;
    data?: { import: { created: number } };
    error?: {
      code: string;
      message: string;
      details?: { errors?: Array<{ lineNumber: number; message: string }> };
    };
  };

  if (!response.ok || !json.success) {
    const { ApiError } = await import('@/lib/api/client');
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN',
      json.error?.message ?? 'Import failed',
      response.status,
      json.error?.details,
    );
  }

  return json.data!;
}

export function useImportMenuGalleryCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: File | { csv: string }) => {
      const token = getPlatformToken();

      if (typeof input === 'object' && 'csv' in input) {
        const response = await fetch(`${API_BASE_URL}/platform/menu-gallery/import/paste`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ csv: input.csv }),
          credentials: 'include',
        });
        return importMenuGalleryCsvResponse(response);
      }

      const formData = new FormData();
      formData.append('file', input);
      const response = await fetch(`${API_BASE_URL}/platform/menu-gallery/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include',
      });
      return importMenuGalleryCsvResponse(response);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'menu-gallery'] });
      qc.invalidateQueries({ queryKey: ['menu', 'gallery-images'] });
    },
  });
}

export function useSubmitPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { interval: 'MONTHLY' | 'YEARLY'; proofImageUrl: string }) =>
      apiFetch<{ submission: import('@/lib/api/types').PaymentSubmission }>(
        '/billing/payment-submissions',
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useCreateInboxSelfTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ notification: import('@/lib/api/types').InboxNotification }>(
        '/notifications/inbox/self-test',
        { method: 'POST', body: JSON.stringify({}) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkInboxNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ notification: import('@/lib/api/types').InboxNotification }>(
        `/notifications/inbox/${id}/read`,
        { method: 'POST', body: JSON.stringify({}) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllInboxNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean }>('/notifications/inbox/read-all', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<import('@/lib/api/types').NotificationPreferences>) =>
      apiFetch<{ preferences: import('@/lib/api/types').NotificationPreferences }>(
        '/notifications/preferences',
        { method: 'PATCH', body: JSON.stringify(body) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
    },
  });
}

export function useUpdatePlatformBillingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<import('@/lib/api/types').PlatformBillingSettings>) =>
      apiFetch<{ settings: import('@/lib/api/types').PlatformBillingSettings }>(
        '/platform/billing/settings',
        { method: 'PATCH', auth: 'platform', body: JSON.stringify(body) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'billing', 'settings'] });
    },
  });
}

export function useUpdatePlatformSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<import('@/lib/api/types').PlatformSettings>) =>
      apiFetch<{ settings: import('@/lib/api/types').PlatformSettings }>('/platform/settings', {
        method: 'PATCH',
        auth: 'platform',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'settings'] });
    },
  });
}

export function useUpdatePlatformReceiptTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: import('@/lib/api/types').ReceiptTemplate) =>
      apiFetch<{ template: import('@/lib/api/types').ReceiptTemplate }>('/platform/receipts', {
        method: 'PATCH',
        auth: 'platform',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'receipt-template'] });
      qc.invalidateQueries({ queryKey: ['receipt-template'] });
    },
  });
}

export function useUpdateBusinessReceiptTemplate(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (override: import('@/lib/api/types').ReceiptTemplateOverride | null) =>
      apiFetch<import('@/lib/api/types').ReceiptTemplateBundle>(
        `/platform/receipts/businesses/${businessId}`,
        {
          method: 'PATCH',
          auth: 'platform',
          body: JSON.stringify({ override }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'receipt-template', businessId] });
      qc.invalidateQueries({ queryKey: ['receipt-template'] });
    },
  });
}

export function useCreateFeedbackTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      type: 'FEEDBACK' | 'BUG_REPORT';
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      subject?: string | null;
      message: string;
      imageKey?: string | null;
    }) =>
      apiFetch<{ ticket: import('@/lib/api/types').FeedbackTicket }>('/feedback/tickets', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback', 'tickets'] });
    },
  });
}

export function useUpdateDemoRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
    }: {
      id: string;
      status: import('@/lib/api/types').DemoRequestStatus;
      adminNote?: string;
    }) =>
      apiFetch<{ request: import('@/lib/api/types').DemoRequest }>(
        `/platform/demo/requests/${id}`,
        {
          method: 'PATCH',
          auth: 'platform',
          body: JSON.stringify({ status, adminNote }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'demo', 'requests'] });
    },
  });
}

export function useUpdatePlatformFeedbackContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: import('@/lib/api/types').FeedbackContactSettings) =>
      apiFetch<{ contact: import('@/lib/api/types').FeedbackContactSettings }>(
        '/platform/feedback/contact',
        {
          method: 'PATCH',
          auth: 'platform',
          body: JSON.stringify(body),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'feedback', 'contact'] });
      qc.invalidateQueries({ queryKey: ['feedback', 'contact'] });
    },
  });
}

export function useResolveFeedbackTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) =>
      apiFetch(`/platform/feedback/tickets/${id}/resolve`, {
        method: 'POST',
        auth: 'platform',
        body: JSON.stringify({ adminNote }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'feedback', 'tickets'] });
    },
  });
}

export function useRejectFeedbackTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) =>
      apiFetch(`/platform/feedback/tickets/${id}/reject`, {
        method: 'POST',
        auth: 'platform',
        body: JSON.stringify({ adminNote }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'feedback', 'tickets'] });
    },
  });
}

export function useApprovePaymentSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) =>
      apiFetch(`/platform/billing/payments/${id}/approve`, {
        method: 'POST',
        auth: 'platform',
        body: JSON.stringify({ adminNote }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'billing', 'payments'] });
      qc.invalidateQueries({ queryKey: ['platform', 'businesses'] });
    },
  });
}

export function useRejectPaymentSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNote }: { id: string; adminNote?: string }) =>
      apiFetch(`/platform/billing/payments/${id}/reject`, {
        method: 'POST',
        auth: 'platform',
        body: JSON.stringify({ adminNote }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'billing', 'payments'] });
    },
  });
}

export function useSetBusinessTrialDays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, trialDays }: { id: string; trialDays: number }) =>
      apiFetch(`/platform/billing/businesses/${id}/trial`, {
        method: 'PATCH',
        auth: 'platform',
        body: JSON.stringify({ trialDays }),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      qc.invalidateQueries({ queryKey: ['platform', 'businesses', id] });
    },
  });
}

export function useSendSubscriptionInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      ...body
    }: {
      businessId: string;
      amount?: number;
      interval?: 'MONTHLY' | 'YEARLY';
      dueInDays: number;
      alertDays: number;
      note?: string;
    }) =>
      apiFetch<{ invoice: import('@/lib/api/types').SubscriptionInvoiceAlert }>(
        `/platform/billing/businesses/${businessId}/subscription-invoice`,
        {
          method: 'POST',
          auth: 'platform',
          body: JSON.stringify(body),
        },
      ),
    onSuccess: (_data, { businessId }) => {
      qc.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      qc.invalidateQueries({ queryKey: ['platform', 'businesses', businessId] });
      qc.invalidateQueries({ queryKey: ['platform', 'businesses', businessId, 'subscription-invoices'] });
    },
  });
}

function patchSubscriptionAfterDismiss(
  qc: ReturnType<typeof useQueryClient>,
  invoiceId: string,
) {
  qc.setQueryData<import('@/lib/api/types').TenantSubscription | undefined>(
    ['billing', 'subscription'],
    (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        purchaseReceipt:
          prev.purchaseReceipt?.id === invoiceId ? null : prev.purchaseReceipt,
        subscriptionInvoice:
          prev.subscriptionInvoice?.id === invoiceId ? null : prev.subscriptionInvoice,
      };
    },
  );
}

export function useDismissSubscriptionInvoiceAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { markInvoiceAlertDismissedLocally } = await import(
        '@/lib/subscription-invoice-dismiss'
      );
      try {
        const result = await apiFetch<{ dismissed: boolean; invoiceId: string }>(
          '/billing/subscription/dismiss-invoice-alert',
          { method: 'POST', body: JSON.stringify({ invoiceId }) },
        );
        markInvoiceAlertDismissedLocally(invoiceId);
        return { ...result, localOnly: false as const };
      } catch (error) {
        const staleApi =
          error instanceof ApiError &&
          (error.code === 'INVALID_RESPONSE' || error.status === 404 || error.status === 405);
        if (staleApi) {
          markInvoiceAlertDismissedLocally(invoiceId);
          return { dismissed: true, invoiceId, localOnly: true as const };
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      patchSubscriptionAfterDismiss(qc, data.invoiceId);
      qc.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
  });
}

export function useDismissPlatformSubscriptionInvoiceAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, invoiceId }: { businessId: string; invoiceId: string }) =>
      apiFetch<{ dismissed: boolean; invoiceId: string }>(
        `/platform/billing/businesses/${businessId}/subscription-invoices/${invoiceId}/dismiss-alert`,
        { method: 'POST', auth: 'platform', body: JSON.stringify({}) },
      ),
    onSuccess: (_data, { businessId }) => {
      qc.invalidateQueries({ queryKey: ['platform', 'businesses', businessId, 'subscription-invoices'] });
      qc.invalidateQueries({ queryKey: ['platform', 'businesses', businessId] });
    },
  });
}

export function useSendPurchaseReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      ...body
    }: {
      businessId: string;
      paymentSubmissionId?: string;
      note?: string;
      alertDays?: number;
    }) =>
      apiFetch<{ invoice: import('@/lib/api/types').SubscriptionInvoiceAlert }>(
        `/platform/billing/businesses/${businessId}/purchase-receipt`,
        {
          method: 'POST',
          auth: 'platform',
          body: JSON.stringify(body),
        },
      ),
    onSuccess: (_data, { businessId }) => {
      qc.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      qc.invalidateQueries({ queryKey: ['platform', 'businesses', businessId] });
      qc.invalidateQueries({ queryKey: ['platform', 'businesses', businessId, 'subscription-invoices'] });
    },
  });
}

export function useBlockBusinessSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/platform/businesses/${id}/block-subscription`, {
        method: 'POST',
        auth: 'platform',
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      qc.invalidateQueries({ queryKey: ['platform', 'businesses', id] });
    },
  });
}

export function useUnblockBusinessSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/platform/businesses/${id}/unblock-subscription`, {
        method: 'POST',
        auth: 'platform',
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['platform', 'businesses'] });
      qc.invalidateQueries({ queryKey: ['platform', 'businesses', id] });
    },
  });
}

function invalidateInventory(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['inventory'] });
  qc.invalidateQueries({ queryKey: ['menu'] });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      unit: string;
      currentQuantity?: number;
      minThreshold?: number | null;
    }) =>
      apiFetch<{ item: InventoryItem }>('/inventory/items', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      unit?: string;
      minThreshold?: number | null;
      isActive?: boolean;
    }) =>
      apiFetch<{ item: InventoryItem }>(`/inventory/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useReceiveInventoryStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      quantity,
      note,
    }: {
      id: string;
      quantity: number;
      note?: string;
    }) =>
      apiFetch(`/inventory/items/${id}/receive`, {
        method: 'POST',
        body: JSON.stringify({ quantity, note }),
      }),
    onMutate: async ({ id, quantity }) => {
      await qc.cancelQueries({ queryKey: ['inventory', 'items'] });
      const snapshots = snapshotQueries(qc, ['inventory', 'items']);
      qc.setQueriesData<InventoryItem[]>({ queryKey: ['inventory', 'items'] }, (old) => {
        if (!old) return old;
        return old.map((item) =>
          item.id === id
            ? {
                ...item,
                currentQuantity: String(Number(item.currentQuantity) + quantity),
              }
            : item,
        );
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useAdjustInventoryStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      quantityDelta,
      note,
    }: {
      id: string;
      quantityDelta: number;
      note?: string;
    }) =>
      apiFetch(`/inventory/items/${id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({ quantityDelta, note }),
      }),
    onMutate: async ({ id, quantityDelta }) => {
      await qc.cancelQueries({ queryKey: ['inventory', 'items'] });
      const snapshots = snapshotQueries(qc, ['inventory', 'items']);
      qc.setQueriesData<InventoryItem[]>({ queryKey: ['inventory', 'items'] }, (old) => {
        if (!old) return old;
        return old.map((item) =>
          item.id === id
            ? {
                ...item,
                currentQuantity: String(Number(item.currentQuantity) + quantityDelta),
              }
            : item,
        );
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => restoreSnapshots(qc, ctx?.snapshots),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useUpdateMenuItemInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      ...body
    }: {
      itemId: string;
      trackingMode: string;
      inventoryItemId?: string | null;
      recipeLines?: Array<{ inventoryItemId: string; quantity: number; unit: string }>;
    }) =>
      apiFetch(`/menu/items/${itemId}/inventory`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useUpdateVariantInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      variantId,
      ...body
    }: {
      variantId: string;
      trackingMode: string;
      inventoryItemId?: string | null;
      recipeLines?: Array<{ inventoryItemId: string; quantity: number; unit: string }>;
    }) =>
      apiFetch(`/menu/variants/${variantId}/inventory`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useUpdateModifierInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      optionId,
      ...body
    }: {
      optionId: string;
      trackingMode: string;
      inventoryItemId?: string | null;
      recipeLines?: Array<{ inventoryItemId: string; quantity: number; unit: string }>;
    }) =>
      apiFetch(`/menu/modifier-options/${optionId}/inventory`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateInventory(qc),
  });
}

function invalidateCashShifts(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['cash-shifts'] });
  qc.invalidateQueries({ queryKey: ['rider', 'cash-pending'] });
}

function invalidateBusinessDays(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['business-days'] });
}

export function useOpenBusinessDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ businessDay: import('@/lib/api/types').BusinessDay }>('/business-days/open', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => invalidateBusinessDays(qc),
  });
}

export function useCloseBusinessDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (businessDayId: string) =>
      apiFetch<{ businessDay: import('@/lib/api/types').BusinessDay }>(
        `/business-days/${businessDayId}/close`,
        { method: 'POST', body: JSON.stringify({}) },
      ),
    onSuccess: () => invalidateBusinessDays(qc),
  });
}

export function useOpenCashShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (openingCash: number) =>
      apiFetch<{ shift: import('@/lib/api/types').CashShift }>('/cash-shifts/open', {
        method: 'POST',
        body: JSON.stringify({ openingCash }),
      }),
    onSuccess: () => invalidateCashShifts(qc),
  });
}

export function useCloseCashShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      actualCash,
      notes,
      closingSettlement,
      transferredCash,
      destinationAccountId,
    }: {
      shiftId: string;
      actualCash: number;
      notes?: string;
      closingSettlement: import('@/lib/api/types').CashClosingSettlement;
      transferredCash?: number;
      destinationAccountId?: string | null;
    }) =>
      apiFetch<{ shift: import('@/lib/api/types').CashShift }>(`/cash-shifts/${shiftId}/close`, {
        method: 'POST',
        body: JSON.stringify({
          actualCash,
          notes,
          closingSettlement,
          transferredCash,
          destinationAccountId,
        }),
      }).then((d) => d.shift),
    onSuccess: () => invalidateCashShifts(qc),
  });
}

export function useCashDrawerMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      type,
      amount,
      reason,
    }: {
      shiftId: string;
      type: 'PAY_IN' | 'PAY_OUT';
      amount: number;
      reason: string;
    }) =>
      apiFetch(`/cash-shifts/${shiftId}/movements`, {
        method: 'POST',
        body: JSON.stringify({ type, amount, reason }),
      }),
    onSuccess: (_data, vars) => {
      invalidateCashShifts(qc);
      qc.invalidateQueries({ queryKey: ['cash-shifts', vars.shiftId, 'summary'] });
    },
  });
}

export function useConfirmRiderCashHandoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { settlementId?: string; riderId?: string }) =>
      apiFetch('/cash-shifts/rider-handoffs/confirm', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      invalidateCashShifts(qc);
      qc.invalidateQueries({ queryKey: ['cash-shifts', 'rider-handoffs', 'pending'] });
    },
  });
}

function invalidateInventoryDaily(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['inventory-daily'] });
  qc.invalidateQueries({ queryKey: ['inventory'] });
}

/** Supplier expenses — gated by `SUPPLIER_EXPENSES_ENABLED` in `@/lib/feature-flags`. */
function invalidateSuppliers(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['inventory', 'suppliers'] });
}

export function useOpenInventoryDailySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { sessionDate?: string; shiftName?: string; openingNotes?: string }) =>
      apiFetch<{ session: import('@/lib/api/types').InventoryDailySession }>('/inventory/daily/open', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateInventoryDaily(qc),
  });
}

export function useCloseInventoryDailySession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      lines,
      closingNotes,
    }: {
      sessionId: string;
      lines: Array<{ inventoryItemId: string; actualClosingQuantity: number }>;
      closingNotes?: string;
    }) =>
      apiFetch<{
        session: import('@/lib/api/types').InventoryDailySession;
        summary: import('@/lib/api/types').InventoryDailySessionSummary;
      }>(`/inventory/daily/${sessionId}/close`, {
        method: 'POST',
        body: JSON.stringify({ lines, closingNotes }),
      }),
    onSuccess: () => invalidateInventoryDaily(qc),
  });
}

export function useRecordInventoryPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      ...body
    }: {
      sessionId: string;
      inventoryItemId: string;
      quantity: number;
      unitCost?: number;
      supplier?: string;
      supplierId?: string;
      invoiceRef?: string;
      notes?: string;
    }) =>
      apiFetch(`/inventory/daily/${sessionId}/purchases`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateInventoryDaily(qc);
      invalidateSuppliers(qc);
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      phone?: string;
      email?: string;
      notes?: string;
      openingBalanceOwed?: number;
    }) =>
      apiFetch<{ supplier: import('@/lib/api/types').SupplierAccount }>('/inventory/suppliers', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateSuppliers(qc),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      phone?: string | null;
      email?: string | null;
      notes?: string | null;
      openingBalanceOwed?: number;
      isActive?: boolean;
    }) =>
      apiFetch<{ supplier: import('@/lib/api/types').SupplierAccount }>(
        `/inventory/suppliers/${id}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      ),
    onSuccess: () => invalidateSuppliers(qc),
  });
}

export function useRecordSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplierId,
      ...body
    }: {
      supplierId: string;
      amount: number;
      method?: string;
      reference?: string;
      notes?: string;
    }) =>
      apiFetch<{ payment: import('@/lib/api/types').SupplierPaymentRecord }>(
        `/inventory/suppliers/${supplierId}/payments`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: () => invalidateSuppliers(qc),
  });
}

export function useRecordInventoryWastage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      ...body
    }: {
      sessionId: string;
      inventoryItemId: string;
      quantity: number;
      reason: import('@/lib/api/types').InventoryWastageReason;
      notes?: string;
    }) =>
      apiFetch(`/inventory/daily/${sessionId}/wastage`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateInventoryDaily(qc),
  });
}

export function useRecordInventoryDailyAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      ...body
    }: {
      sessionId: string;
      inventoryItemId: string;
      quantityDelta: number;
      note?: string;
    }) =>
      apiFetch(`/inventory/daily/${sessionId}/adjustments`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateInventoryDaily(qc),
  });
}
