import type {
  CompleteOrderInput,
  OrderPaymentLineInput,
  OrderPaymentStatus,
  PaymentMethod,
} from '../../domain/entities/order.entity';
import { InvalidPaymentError } from '../../domain/errors/order.errors';

export function normalizeCompleteOrderInput(
  totalAmount: number,
  completion?: CompleteOrderInput | PaymentMethod,
): CompleteOrderInput & { payments: OrderPaymentLineInput[]; paymentStatus: OrderPaymentStatus; paymentMethod: PaymentMethod } {
  let input: CompleteOrderInput;

  if (typeof completion === 'string') {
    input = {
      paymentMethod: completion,
      payments: [{ method: completion, amount: totalAmount }],
    };
  } else {
    input = completion ?? {};
  }

  const payments =
    input.payments && input.payments.length > 0
      ? input.payments
      : input.paymentMethod
        ? [{ method: input.paymentMethod, amount: totalAmount }]
        : [];

  if (payments.length === 0) {
    throw new InvalidPaymentError('At least one payment is required to complete an order');
  }

  for (const line of payments) {
    if (line.amount <= 0) {
      throw new InvalidPaymentError('Each payment amount must be greater than zero');
    }
    if (line.method === 'CASH' && line.amountReceived != null && line.amountReceived < line.amount) {
      throw new InvalidPaymentError('Cash received must be at least the payment amount');
    }
  }

  const paidTotal = Math.round(payments.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
  const methods = new Set(payments.map((line) => line.method));

  let paymentMethod: PaymentMethod;
  if (methods.size === 1) {
    paymentMethod = payments[0]!.method;
  } else {
    paymentMethod = input.paymentMethod ?? 'OTHER';
  }

  let paymentStatus: OrderPaymentStatus = input.paymentStatus ?? 'PENDING';
  if (!input.paymentStatus) {
    if (paidTotal >= totalAmount - 0.001) paymentStatus = 'PAID';
    else if (paidTotal > 0) paymentStatus = 'PARTIAL';
    else paymentStatus = 'PENDING';
  }

  return {
    ...input,
    payments,
    paymentMethod,
    paymentStatus,
  };
}

export function cashPaymentTotal(payments: OrderPaymentLineInput[]): number {
  return Math.round(
    payments.filter((line) => line.method === 'CASH').reduce((sum, line) => sum + line.amount, 0) * 100,
  ) / 100;
}
