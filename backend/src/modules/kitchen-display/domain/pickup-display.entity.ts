import type { KitchenTicketStatus } from '@prisma/client';

export type PickupDisplayColumn = 'PREPARING' | 'READY';

export interface PickupDisplayTicket {
  id: string;
  displayNumber: string;
  status: PickupDisplayColumn;
  orderType: string;
  updatedAt: string;
}

export function mapKitchenStatusToPickupColumn(
  status: KitchenTicketStatus,
): PickupDisplayColumn | null {
  if (status === 'READY') return 'READY';
  if (status === 'RECEIVED' || status === 'PREPARING') return 'PREPARING';
  return null;
}
