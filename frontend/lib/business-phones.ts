/** Phone lines for thermal receipts (deduped, trimmed). */
export function receiptPhoneLines(
  phone?: string | null,
  phoneSecondary?: string | null,
): string[] {
  const primary = phone?.trim();
  const secondary = phoneSecondary?.trim();
  const lines: string[] = [];
  if (primary) lines.push(primary);
  if (secondary && (!primary || !phonesEqual(secondary, primary))) lines.push(secondary);
  return lines;
}

export function receiptPrintPhoneOptions(
  business?: { phone?: string | null; phoneSecondary?: string | null } | null,
): { businessPhone?: string | null; businessPhoneSecondary?: string | null } {
  if (!business) return {};
  return {
    businessPhone: business.phone ?? null,
    businessPhoneSecondary: business.phoneSecondary ?? null,
  };
}

export function formatBusinessPhonesDisplay(
  phone?: string | null,
  phoneSecondary?: string | null,
): string {
  const lines = receiptPhoneLines(phone, phoneSecondary);
  if (!lines.length) return 'Not set';
  return lines.join(' · ');
}

function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function phonesEqual(a: string, b: string): boolean {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  if (!da || !db) return a.trim() === b.trim();
  return da === db || da.endsWith(db) || db.endsWith(da);
}

export function businessPhonesDuplicate(
  phone?: string | null,
  phoneSecondary?: string | null,
): boolean {
  const primary = phone?.trim();
  const secondary = phoneSecondary?.trim();
  if (!primary || !secondary) return false;
  return phonesEqual(primary, secondary);
}

/** Restaurant Tel line for receipt header — Settings primary | secondary only. */
export function formatRestaurantReceiptPhones(
  phone?: string | null,
  phoneSecondary?: string | null,
): string | null {
  const lines = receiptPhoneLines(phone, phoneSecondary);
  if (!lines.length) return null;
  return lines.join(' | ');
}
