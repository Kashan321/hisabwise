export type CashClosingSettlement =
  | 'KEEP_IN_DRAWER'
  | 'HANDOVER_TO_OWNER'
  | 'TRANSFER_TO_WALLET'
  | 'TRANSFER_TO_BANK'
  | 'OTHER';

export const CLOSING_SETTLEMENT_OPTIONS: {
  value: CashClosingSettlement;
  label: string;
}[] = [
  { value: 'KEEP_IN_DRAWER', label: 'Keep cash in drawer' },
  { value: 'HANDOVER_TO_OWNER', label: 'Cash handover to owner' },
  { value: 'TRANSFER_TO_WALLET', label: 'Transfer to wallet' },
  { value: 'TRANSFER_TO_BANK', label: 'Transfer to bank' },
  { value: 'OTHER', label: 'Other' },
];

export function closingSettlementLabel(value: CashClosingSettlement | string | null | undefined): string {
  return CLOSING_SETTLEMENT_OPTIONS.find((o) => o.value === value)?.label ?? '—';
}
