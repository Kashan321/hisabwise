import { STORAGE_KEY_PREFIX } from '@/lib/config';

function storageKey(invoiceId: string) {
  return `${STORAGE_KEY_PREFIX}:dismissed-invoice-alert:${invoiceId}`;
}

export function isInvoiceAlertDismissedLocally(invoiceId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(storageKey(invoiceId)) === '1';
  } catch {
    return false;
  }
}

export function markInvoiceAlertDismissedLocally(invoiceId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(invoiceId), '1');
  } catch {
    /* ignore */
  }
}
