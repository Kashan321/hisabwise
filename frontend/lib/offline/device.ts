import { offlineDb } from '@/lib/offline/db';
import { apiFetch } from '@/lib/api/client';

const DEVICE_KEY_STORAGE = 'hisabwise:pos-device-key';

function newDeviceKey() {
  return crypto.randomUUID();
}

export function getOrCreateDeviceKey(): string {
  if (typeof window === 'undefined') return newDeviceKey();
  try {
    const existing = localStorage.getItem(DEVICE_KEY_STORAGE);
    if (existing) return existing;
    const created = newDeviceKey();
    localStorage.setItem(DEVICE_KEY_STORAGE, created);
    return created;
  } catch {
    return newDeviceKey();
  }
}

export async function ensurePosDeviceRegistered(scopeKey: string) {
  const deviceKey = getOrCreateDeviceKey();
  const local = await offlineDb.devices.get(scopeKey);
  if (local) return local;

  const { device } = await apiFetch<{
    device: {
      deviceKey: string;
      ticketPrefix: string;
      nextOfflineTicketNumber: number;
    };
  }>('/pos/devices/register', {
    method: 'POST',
    body: JSON.stringify({ deviceKey }),
  });

  const record = {
    scopeKey,
    deviceKey: device.deviceKey,
    ticketPrefix: device.ticketPrefix,
    nextOfflineTicketNumber: device.nextOfflineTicketNumber,
  };
  await offlineDb.devices.put(record);
  return record;
}

async function getOrCreateLocalDevice(scopeKey: string) {
  const existing = await offlineDb.devices.get(scopeKey);
  if (existing) return existing;
  const record = {
    scopeKey,
    deviceKey: getOrCreateDeviceKey(),
    ticketPrefix: 'A',
    nextOfflineTicketNumber: 1,
  };
  await offlineDb.devices.put(record);
  return record;
}

export async function allocateOfflineTicket(scopeKey: string) {
  const device = await getOrCreateLocalDevice(scopeKey);
  const offlineTicketNumber = device.nextOfflineTicketNumber;
  const offlineTicketLabel = `${device.ticketPrefix}-${String(offlineTicketNumber).padStart(3, '0')}`;
  await offlineDb.devices.put({
    ...device,
    nextOfflineTicketNumber: offlineTicketNumber + 1,
  });
  return { offlineTicketNumber, offlineTicketLabel, deviceKey: device.deviceKey };
}

export function clearOfflineDevice(scopeKey: string) {
  return offlineDb.devices.delete(scopeKey);
}
