import Dexie, { type Table } from 'dexie';
import type { Business, MenuCategory, Order } from '@/lib/api/types';

export type OfflineSyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

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
  payload: Record<string, unknown>;
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
