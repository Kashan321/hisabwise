export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'WALLET' | 'ONLINE' | 'OTHER';
export type OrderPaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'FAILED';

export const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  icon: string;
}> = [
  { value: 'CASH', label: 'Cash', icon: 'payments' },
  { value: 'CARD', label: 'Card', icon: 'credit_card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: 'account_balance' },
  { value: 'WALLET', label: 'Wallet', icon: 'account_balance_wallet' },
  { value: 'ONLINE', label: 'Online', icon: 'smartphone' },
  { value: 'OTHER', label: 'Other', icon: 'more_horiz' },
];

export const PAYMENT_STATUS_LABELS: Record<OrderPaymentStatus, string> = {
  PAID: 'Paid',
  PARTIAL: 'Partial',
  PENDING: 'Pending',
  FAILED: 'Failed',
};

export interface OrderPaymentLine {
  method: PaymentMethod;
  amount: number;
  amountReceived?: number;
  changeGiven?: number;
  referenceNumber?: string;
}

export interface CompleteOrderPaymentPayload {
  payments: OrderPaymentLine[];
  paymentStatus: OrderPaymentStatus;
  paymentMethod?: PaymentMethod;
}

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

export function derivePrimaryPaymentMethod(payments: OrderPaymentLine[]): PaymentMethod {
  const methods = new Set(payments.map((line) => line.method));
  if (methods.size === 1) return payments[0]!.method;
  return 'OTHER';
}

export function derivePaymentStatus(
  payments: OrderPaymentLine[],
  totalAmount: number,
): OrderPaymentStatus {
  const paid = Math.round(payments.reduce((sum, line) => sum + (line.amount || 0), 0) * 100) / 100;
  if (paid >= totalAmount - 0.001) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'PENDING';
}

export function orderNeedsPaymentOnDelivery(order: {
  status: string;
  paymentStatus?: string | null;
}) {
  return order.status !== 'COMPLETED' && order.paymentStatus !== 'PAID';
}

/** True when a customer receipt should show the paid / customer-copy banner (not UNPAID). */
export function isOrderPaidForReceipt(order: {
  paymentStatus?: string | null;
  totalAmount?: string | number;
  payments?: Array<{ amount: string | number }> | null;
}): boolean {
  if (order.paymentStatus === 'PAID') return true;
  const payments = order.payments ?? [];
  if (payments.length > 0 && order.totalAmount != null) {
    const total = Number(order.totalAmount);
    const paid = payments.reduce((sum, line) => sum + Number(line.amount ?? 0), 0);
    if (paid >= total - 0.001) return true;
  }
  return false;
}

export function buildCompleteOrderPaymentPayload(
  payments: OrderPaymentLine[],
  totalAmount: number,
): CompleteOrderPaymentPayload {
  const normalized = payments
    .filter((line) => line.amount > 0)
    .map((line) => {
      if (line.method !== 'CASH') return line;
      const received = line.amountReceived ?? line.amount;
      const change = Math.max(0, Math.round((received - line.amount) * 100) / 100);
      return {
        ...line,
        amountReceived: received,
        changeGiven: change > 0 ? change : undefined,
      };
    });

  return {
    payments: normalized,
    paymentStatus: derivePaymentStatus(normalized, totalAmount),
    paymentMethod: derivePrimaryPaymentMethod(normalized),
  };
}
