import { API_BASE_URL } from '@/lib/config';

const HEARTBEAT_INTERVAL_MS = 15_000;
const HEARTBEAT_TIMEOUT_MS = 4_000;

export type ApiReachability = 'online' | 'offline' | 'checking';

let reachability: ApiReachability =
  typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'checking';
let listeners = new Set<(value: ApiReachability) => void>();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function emit(value: ApiReachability) {
  reachability = value;
  listeners.forEach((listener) => listener(value));
}

export function subscribeApiReachability(listener: (value: ApiReachability) => void) {
  listeners.add(listener);
  listener(reachability);
  return () => {
    listeners.delete(listener);
  };
}

export function getApiReachability() {
  return reachability;
}

export async function pingApiHealth(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    emit('offline');
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
      signal: controller.signal,
    });
    const ok = res.ok;
    emit(ok ? 'online' : 'offline');
    return ok;
  } catch {
    emit('offline');
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function startApiHeartbeat() {
  if (heartbeatTimer) return;
  void pingApiHealth();
  heartbeatTimer = setInterval(() => {
    void pingApiHealth();
  }, HEARTBEAT_INTERVAL_MS);

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void pingApiHealth());
    window.addEventListener('offline', () => emit('offline'));
  }
}

export function stopApiHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
