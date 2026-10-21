'use client';

import { useEffect, useMemo, useState } from 'react';

export type NetworkQuality = 'connected' | 'degraded' | 'offline' | 'unreachable' | 'syncing';

export interface NetworkStatus {
  quality: NetworkQuality;
  online: boolean;
  /** Human-readable link type, e.g. WiFi, Ethernet, Mobile Data */
  networkName: string;
  lastSync: Date | null;
}

export interface UseNetworkStatusOptions {
  /** Last successful data fetch from the screen's primary query */
  lastDataSync?: Date | null;
  /** True when the primary query's latest fetch failed */
  syncFailed?: boolean;
  /** True while the primary query is actively refetching */
  isSyncing?: boolean;
}

const RECENT_SYNC_MS = 45_000;
const STALE_SYNC_MS = 120_000;

interface NavigatorConnection {
  type?: string;
  effectiveType?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

function getConnection(): NavigatorConnection | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NavigatorConnection }).connection;
}

function formatNetworkName(conn: NavigatorConnection | undefined, online: boolean): string {
  const type = conn?.type?.toLowerCase();
  switch (type) {
    case 'wifi':
      return 'WiFi';
    case 'ethernet':
      return 'Ethernet';
    case 'cellular':
      return 'Mobile Data';
    case 'bluetooth':
      return 'Bluetooth';
    default:
      break;
  }

  const effective = conn?.effectiveType?.toLowerCase();
  if (effective === '2g' || effective === '3g' || effective === 'slow-2g') {
    return 'Mobile Data';
  }

  if (!online) return 'Offline';
  return 'WiFi';
}

function resolveQuality(online: boolean, options: UseNetworkStatusOptions): NetworkQuality {
  if (!online) return 'offline';
  if (options.isSyncing) return 'syncing';

  const syncAge = options.lastDataSync
    ? Date.now() - options.lastDataSync.getTime()
    : Number.POSITIVE_INFINITY;

  if (!options.lastDataSync) {
    return options.syncFailed ? 'unreachable' : 'connected';
  }

  if (syncAge < RECENT_SYNC_MS) {
    return options.syncFailed ? 'degraded' : 'connected';
  }

  if (syncAge < STALE_SYNC_MS) {
    return options.syncFailed ? 'degraded' : 'connected';
  }

  return options.syncFailed ? 'unreachable' : 'degraded';
}

/**
 * Connection badge for KDS — uses browser online state + the screen's existing
 * React Query sync (no extra /health polling).
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}) {
  const { lastDataSync, syncFailed, isSyncing } = options;
  const [online, setOnline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine,
  );
  const [connTick, setConnTick] = useState(0);

  useEffect(() => {
    function onOnline() {
      setOnline(true);
    }
    function onOffline() {
      setOnline(false);
    }

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const conn = getConnection();
    const onConnChange = () => setConnTick((n) => n + 1);
    conn?.addEventListener?.('change', onConnChange);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      conn?.removeEventListener?.('change', onConnChange);
    };
  }, []);

  return useMemo((): NetworkStatus => {
    void connTick;
    const conn = getConnection();
    const networkName = formatNetworkName(conn, online);
    const quality = resolveQuality(online, { lastDataSync, syncFailed, isSyncing });

    return {
      quality,
      online,
      networkName: quality === 'offline' ? 'Offline' : networkName,
      lastSync: lastDataSync ?? null,
    };
  }, [online, connTick, lastDataSync, syncFailed, isSyncing]);
}

export function networkStatusLabel(status: NetworkStatus): string {
  switch (status.quality) {
    case 'offline':
      return 'Offline';
    case 'unreachable':
      return 'No connection';
    case 'syncing':
    case 'degraded':
    case 'connected':
      return 'Connected';
  }
}

export function networkStatusIcon(status: NetworkStatus): string {
  if (status.quality === 'offline') return 'wifi_off';
  if (status.quality === 'unreachable') return 'cloud_off';
  if (status.quality === 'syncing') return 'sync';
  return 'wifi';
}
