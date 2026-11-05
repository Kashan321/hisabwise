const STORAGE_PREFIX = 'venta:checkout-idempotency:';

export type PendingCheckoutRecord = {
  idempotencyKey: string;
  slug: string;
  createdAt: number;
};

function storageKey(slug: string) {
  return `${STORAGE_PREFIX}${slug}`;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function readPendingCheckout(slug: string): PendingCheckoutRecord | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckoutRecord;
    if (parsed.slug !== slug || !parsed.idempotencyKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Reuse the same key for retries/timeouts until checkout succeeds or is reset. */
export function getOrCreateCheckoutIdempotencyKey(slug: string): string {
  const existing = readPendingCheckout(slug);
  if (existing) return existing.idempotencyKey;
  const record: PendingCheckoutRecord = {
    idempotencyKey: crypto.randomUUID(),
    slug,
    createdAt: Date.now(),
  };
  if (canUseStorage()) {
    sessionStorage.setItem(storageKey(slug), JSON.stringify(record));
  }
  return record.idempotencyKey;
}

export function resetCheckoutIdempotencyKey(slug: string) {
  if (!canUseStorage()) return;
  try {
    sessionStorage.removeItem(storageKey(slug));
  } catch {
    /* ignore */
  }
}
