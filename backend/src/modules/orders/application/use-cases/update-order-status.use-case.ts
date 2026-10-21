import { ORDER_STATUS_TRANSITIONS } from '../../../../config/constants';
import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { getRawPrismaClient } from '../../../../shared/database/prisma-client';
import { PRISMA_TRANSACTION_OPTIONS } from '../../../../shared/database/prisma-transaction-options';
import { cashShiftModule } from '../../../cash-shift/infrastructure/cash-shift.module';
import {
  cashPaymentTotal,
  normalizeCompleteOrderInput,
} from '../services/order-payment.service';
import { CompleteOrderInput, OrderStatus } from '../../domain/entities/order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { InvalidOrderStatusError, OrderNotFoundError } from '../../domain/errors/order.errors';
import { inventoryStockService } from '../../../inventory/application/services/inventory-stock.service';

export class UpdateOrderStatusUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    businessId: string,
    orderId: string,
    status: OrderStatus,
    completion?: CompleteOrderInput,
    actorId?: string,
  ) {
    const order = await this.orderRepository.findById(businessId, orderId);
    if (!order) throw new OrderNotFoundError();

    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new InvalidOrderStatusError(
        `Cannot transition order from ${order.status} to ${status}`,
      );
    }

    let updated;
    let completionInput: CompleteOrderInput | undefined;

    if (status === 'COMPLETED') {
      const normalized = normalizeCompleteOrderInput(Number(order.totalAmount), completion);
      const openShift = await cashShiftModule.repository.findOpenShift(businessId);
      completionInput = {
        ...normalized,
        cashShiftId: openShift?.id,
        completedById: actorId,
      };
    }

    const statusOptions = {
      actorId,
      completion: completionInput,
    };

    if (status === 'COMPLETED') {
      const deductionPlan = await inventoryStockService.prepareDeduction(businessId, orderId);
      updated = await getRawPrismaClient().$transaction(
        async (tx) => {
          const row = await this.orderRepository.updateStatus(
            businessId,
            orderId,
            status,
            statusOptions,
            tx,
          );
          if (deductionPlan) {
            await inventoryStockService.commitDeduction(deductionPlan, actorId, tx);
          }
          if (completionInput?.cashShiftId && completionInput.payments) {
            const cashTotal = cashPaymentTotal(completionInput.payments);
            if (cashTotal > 0 && actorId) {
              await cashShiftModule.repository.recordCashSale(
                tx,
                businessId,
                completionInput.cashShiftId,
                orderId,
                cashTotal,
                actorId,
              );
            }
          }
          return row;
        },
        PRISMA_TRANSACTION_OPTIONS,
      );
      if (deductionPlan) {
        emitDomainEvent('inventory.stock_changed', { businessId, orderId });
      }
    } else if (status === 'CANCELLED') {
      const reversalPlan = await inventoryStockService.prepareReversal(businessId, orderId);
      const cashRefundTotal =
        order.status === 'COMPLETED'
          ? cashPaymentTotal(
              (order.payments ?? []).map((payment) => ({
                method: payment.method,
                amount: Number(payment.amount),
              })),
            )
          : 0;
      const openShift =
        cashRefundTotal > 0
          ? await cashShiftModule.repository.findOpenShift(businessId)
          : null;

      updated = await getRawPrismaClient().$transaction(
        async (tx) => {
          if (reversalPlan) {
            await inventoryStockService.commitReversal(reversalPlan, actorId, tx);
          }
          const row = await this.orderRepository.updateStatus(
            businessId,
            orderId,
            status,
            { actorId },
            tx,
          );
          if (cashRefundTotal > 0 && openShift && actorId) {
            await cashShiftModule.repository.recordCashRefund(
              tx,
              businessId,
              openShift.id,
              orderId,
              cashRefundTotal,
              actorId,
              'Cash refund for cancelled order',
            );
          }
          return row;
        },
        PRISMA_TRANSACTION_OPTIONS,
      );
      if (reversalPlan) {
        emitDomainEvent('inventory.stock_changed', { businessId, orderId });
      }
    } else {
      updated = await this.orderRepository.updateStatus(
        businessId,
        orderId,
        status,
        { actorId },
      );
    }

    emitDomainEvent('order.status_changed', {
      orderId: updated.id,
      businessId,
      status: updated.status,
      customerId: updated.customerId,
      totalAmount: updated.totalAmount,
      paymentMethod: updated.paymentMethod,
      paymentStatus: updated.paymentStatus,
    });

    return updated;
  }
}
