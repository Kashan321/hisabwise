import Dexie, { type Table } from 'dexie';
import type { Business, MenuCategory, Order } from '@/lib/api/types';

export type OfflineSyncStatus = 'pending' | 'syncing' | 'synced' | 'error';
export type OfflineOrderLifecycle = 'open' | 'completed' | 'cancelled' | 'held';

export interface OfflineItemUpdateRecord {
  appliedAt: string;
  items: Array<Record<string, unknown>>;
  taxRate?: number;
  serviceRate?: number;
}

export interface OfflineItemAdjustmentRecord {
  appliedAt: string;
  clientItemId: string;
  menuItemId: string;
  delta: number;
}

export interface OfflinePricingUpdateRecord {
  appliedAt: string;
  patch: {
    promotionId?: string | null;
    discountType?: 'PERCENTAGE' | 'FIXED';
    discountValue?: number;
    taxRate?: number;
    serviceRate?: number;
    notes?: string;
  };
}

export interface OfflineSnapshotRecord {
  scopeKey: string;
  businessId: string;
  userId: string;
  generatedAt: string;
  business: Business;
  menu: MenuCategory[];
  businessDay: { id: string; businessDate: string; status: string } | null;
  authUserJson?: string;
  accessToken?: string;
}

export interface PendingOfflineOrderRecord {
  id: string;
  scopeKey: string;
  idempotencyKey: string;
  syncStatus: OfflineSyncStatus;
  syncError?: string;
  offlineTicketLabel: string;
  offlineTicketNumber: number;
  createdAt: string;
  /** Initial punch payload (no payment). */
  createPayload?: Record<string, unknown>;
  itemUpdates?: OfflineItemUpdateRecord[];
  itemAdjustments?: OfflineItemAdjustmentRecord[];
  pricingUpdates?: OfflinePricingUpdateRecord[];
  /** Replay send-to-kitchen after syncing a held (draft) bill. */
  replaySendToKitchen?: boolean;
  completeWithCash?: { amountReceived?: number; changeGiven?: number };
  lifecycle?: OfflineOrderLifecycle;
  /** @deprecated legacy combined payload — migrated on read */
  payload?: Record<string, unknown>;
  receiptOrder: Order;
  serverTicketLabel?: string;
  serverOrderId?: string;
}

export interface PosDeviceRecord {
  scopeKey: string;
  deviceKey: string;
  ticketPrefix: string;
  nextOfflineTicketNumber: number;
}

export class OfflinePosDexie extends Dexie {
  snapshots!: Table<OfflineSnapshotRecord, string>;
  pendingOrders!: Table<PendingOfflineOrderRecord, string>;
  devices!: Table<PosDeviceRecord, string>;

  constructor() {
    super('hisabwise-offline-pos');
    this.version(1).stores({
      snapshots: 'scopeKey',
      pendingOrders: 'id, scopeKey, syncStatus, createdAt',
      devices: 'scopeKey',
    });
  }
}

export const offlineDb = new OfflinePosDexie();

export function offlineScopeKey(businessId: string, userId: string) {
  return `${businessId}:${userId}`;
}
