export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'WALLET' | 'ONLINE' | 'OTHER';
export type OrderPaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'FAILED';

export interface OrderPaymentLine {
  method: PaymentMethod;
  amount: number;
  amountReceived?: number;
  changeGiven?: number;
  referenceNumber?: string;
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

export function derivePrimaryPaymentMethod(payments: OrderPaymentLine[]): PaymentMethod {
  const methods = new Set(payments.map((line) => line.method));
  if (methods.size === 1) return payments[0]!.method;
  return 'OTHER';
}

export function buildCompleteOrderPaymentPayload(
  payments: OrderPaymentLine[],
  totalAmount: number,
): {
  payments: OrderPaymentLine[];
  paymentStatus: OrderPaymentStatus;
  paymentMethod?: PaymentMethod;
} {
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