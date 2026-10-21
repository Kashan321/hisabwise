import { prisma } from '../../../../shared/database/prisma-client';
import { OrderFiltersMeta } from '../../domain/entities/order.entity';

const SOURCES = [
  { value: 'QR_CUSTOMER', label: 'QR Code' },
  { value: 'STAFF_ASSISTED', label: 'Staff Handheld' },
  { value: 'ONLINE_DELIVERY', label: 'Online Delivery' },
] as const;

const ORDER_TYPES = [
  { value: 'DINE_IN', label: 'Dine In' },
  { value: 'TAKEAWAY', label: 'Takeaway' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'QR', label: 'QR Order' },
] as const;

const STATUS_GROUPS = [
  { value: 'all', label: 'All Orders' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'WALLET', label: 'Wallet' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'OTHER', label: 'Other' },
] as const;

const DELIVERY_STATUSES = [
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
] as const;

export class GetOrderFiltersUseCase {
  async execute(businessId: string): Promise<OrderFiltersMeta> {
    const tables = await prisma.floorTable.findMany({
      where: { businessId },
      select: { id: true, tableIdentifier: true },
      orderBy: { tableIdentifier: 'asc' },
    });

    return {
      sources: SOURCES.map((s) => ({ value: s.value, label: s.label })),
      orderTypes: ORDER_TYPES.map((t) => ({ value: t.value, label: t.label })),
      tables,
      statusGroups: STATUS_GROUPS.map((g) => ({ value: g.value, label: g.label })),
      paymentMethods: PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label })),
      deliveryStatuses: DELIVERY_STATUSES.map((d) => ({ value: d.value, label: d.label })),
    };
  }
}
