/** Diagnostics for service worker + shell caches used by offline POS. */

export type SwReadinessSnapshot = {
  serviceWorkerSupported: boolean;
  controllerPresent: boolean;
  registrationScope: string | null;
  activeScriptUrl: string | null;
  waitingScriptUrl: string | null;
  installingState: string | null;
  cacheKeys: string[];
  shellCacheCounts: Record<string, number>;
  precacheShellHits: Record<string, boolean>;
  indexedDbSnapshotPresent: boolean;
};

const SHELL_PATHS = ['/offline-pos', '/offline', '/login'] as const;

export async function probeSwReadiness(scopeKey: string | null): Promise<SwReadinessSnapshot> {
  const serviceWorkerSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  let controllerPresent = false;
  let registrationScope: string | null = null;
  let activeScriptUrl: string | null = null;
  let waitingScriptUrl: string | null = null;
  let installingState: string | null = null;

  if (serviceWorkerSupported) {
    controllerPresent = !!navigator.serviceWorker.controller;
    const reg = await navigator.serviceWorker.getRegistration();
    registrationScope = reg?.scope ?? null;
    activeScriptUrl = reg?.active?.scriptURL ?? navigator.serviceWorker.controller?.scriptURL ?? null;
    waitingScriptUrl = reg?.waiting?.scriptURL ?? null;
    installingState = reg?.installing?.state ?? null;
  }

  const cacheKeys =
    typeof caches !== 'undefined' ? (await caches.keys()).sort((a, b) => a.localeCompare(b)) : [];
  const shellCacheCounts: Record<string, number> = {};
  for (const name of ['pages', 'pos-route-all', 'pages-rsc', 'precache']) {
    if (!cacheKeys.includes(name)) continue;
    const cache = await caches.open(name);
    shellCacheCounts[name] = (await cache.keys()).length;
  }

  const precacheShellHits: Record<string, boolean> = {};
  for (const path of SHELL_PATHS) {
    let hit = false;
    for (const cacheName of cacheKeys) {
      if (!cacheName.includes('precache') && cacheName !== 'workbox-precache-v2') continue;
      const cache = await caches.open(cacheName);
      const absolute = new URL(path, window.location.origin).href;
      if (
        (await cache.match(path)) ??
        (await cache.match(absolute)) ??
        (await cache.match(new Request(absolute)))
      ) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      for (const cacheName of ['pages', 'pos-route-all']) {
        if (!cacheKeys.includes(cacheName)) continue;
        const cache = await caches.open(cacheName);
        const absolute = new URL(path, window.location.origin).href;
        if (await cache.match(absolute, { ignoreSearch: true })) {
          hit = true;
          break;
        }
      }
    }
    precacheShellHits[path] = hit;
  }

  let indexedDbSnapshotPresent = false;
  if (scopeKey && typeof indexedDB !== 'undefined') {
    indexedDbSnapshotPresent = await new Promise((resolve) => {
      const open = indexedDB.open('hisabwise-offline-pos');
      open.onsuccess = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains('snapshots')) {
          resolve(false);
          return;
        }
        const tx = db.transaction('snapshots', 'readonly');
        const req = tx.objectStore('snapshots').get(scopeKey);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
      };
      open.onerror = () => resolve(false);
    });
  }

  return {
    serviceWorkerSupported,
    controllerPresent,
    registrationScope,
    activeScriptUrl,
    waitingScriptUrl,
    installingState,
    cacheKeys,
    shellCacheCounts,
    precacheShellHits,
    indexedDbSnapshotPresent,
  };
}

export function isReadyForOffline(
  snap: SwReadinessSnapshot,
  options?: { requireSnapshot?: boolean },
): boolean {
  const requireSnapshot = options?.requireSnapshot ?? true;
  if (!snap.serviceWorkerSupported || !snap.controllerPresent) return false;
  const hasHtmlShell =
    (snap.shellCacheCounts.pages ?? 0) > 0 ||
    (snap.shellCacheCounts['pos-route-all'] ?? 0) > 0 ||
    Object.values(snap.precacheShellHits).some(Boolean);
  if (!hasHtmlShell) return false;
  if (requireSnapshot && !snap.indexedDbSnapshotPresent) return false;
  if (snap.waitingScriptUrl && !snap.activeScriptUrl) return false;
  return true;
}