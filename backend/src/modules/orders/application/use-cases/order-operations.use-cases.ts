import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { tenantAuditService } from '../../../../shared/audit/tenant-audit.service';
import { getRawPrismaClient } from '../../../../shared/database/prisma-client';
import { PRISMA_TRANSACTION_OPTIONS } from '../../../../shared/database/prisma-transaction-options';
import { inventoryStockService } from '../../../inventory/application/services/inventory-stock.service';
import { cashShiftModule } from '../../../cash-shift/infrastructure/cash-shift.module';
import {
  AddOrderItemsInput,
  CompleteOrderInput,
  CreateOrderChangeRequestInput,
  DeliveryStatus,
  ReviewOrderChangeRequestInput,
} from '../../domain/entities/order.entity';
import { InvalidPaymentError, OrderNotFoundError } from '../../domain/errors/order.errors';
import { OrderRepository, OrderPricingPort } from '../../domain/repositories/order.repository';
import {
  cashPaymentTotal,
  normalizeCompleteOrderInput,
} from '../services/order-payment.service';

export class AddOrderItemsUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly pricingService: OrderPricingPort,
  ) {}

  async execute(
    businessId: string,
    orderId: string,
    input: AddOrderItemsInput,
    actor: { userId: string; userName?: string },
  ) {
    const pricing = await this.pricingService.calculateAdditionalItems(businessId, input);
    const order = await this.orderRepository.addItems(businessId, orderId, pricing);

    emitDomainEvent('order.items_added', { orderId, businessId });

    await tenantAuditService.log({
      businessId,
      userId: actor.userId,
      action: 'order.items_added',
      targetType: 'order',
      targetId: orderId,
      metadata: { userName: actor.userName, itemCount: input.items.length },
    });

    return order;
  }
}

export class AdjustOrderItemQuantityUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    businessId: string,
    orderId: string,
    orderItemId: string,
    delta: number,
    actor: { userId: string; userName?: string },
  ) {
    const order = await this.orderRepository.adjustOrderItemQuantity(
      businessId,
      orderId,
      orderItemId,
      delta,
    );

    emitDomainEvent('order.items_removed', { orderId, businessId });

    await tenantAuditService.log({
      businessId,
      userId: actor.userId,
      action: 'order.items_removed',
      targetType: 'order',
      targetId: orderId,
      metadata: { userName: actor.userName, orderItemId, delta },
    });

    return order;
  }
}

export class SendOrderToKitchenUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    businessId: string,
    orderId: string,
    actor: { userId: string; userName?: string },
  ) {
    const order = await this.orderRepository.sendToKitchen(businessId, orderId);

    emitDomainEvent('order.placed', { orderId: order.id, businessId });

    await tenantAuditService.log({
      businessId,
      userId: actor.userId,
      action: 'order.sent_to_kitchen',
      targetType: 'order',
      targetId: orderId,
      metadata: { userName: actor.userName },
    });

    return order;
  }
}

export class AssignRiderUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    businessId: string,
    orderId: string,
    riderId: string,
    actor: { userId: string; userName?: string },
  ) {
    const order = await this.orderRepository.assignRider(businessId, orderId, riderId);

    emitDomainEvent('order.rider_assigned', { orderId, businessId, riderId });
    emitDomainEvent('order.delivery_updated', {
      orderId,
      businessId,
      deliveryStatus: order.deliveryStatus ?? 'ASSIGNED',
    });

    await tenantAuditService.log({
      businessId,
      userId: actor.userId,
      action: 'delivery.rider_assigned',
      targetType: 'order',
      targetId: orderId,
      metadata: { riderId, userName: actor.userName },
    });

    return order;
  }
}

function orderNeedsPaymentOnDelivery(order: {
  status: string;
  paymentStatus: string | null;
}) {
  return order.status !== 'COMPLETED' && order.paymentStatus !== 'PAID';
}

export class UpdateDeliveryStatusUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    businessId: string,
    orderId: string,
    deliveryStatus: DeliveryStatus,
    actor: { userId: string; userName?: string },
    completion?: CompleteOrderInput,
  ) {
    const existing = await this.orderRepository.findById(businessId, orderId);
    if (!existing) throw new OrderNotFoundError();

    let order;
    let completedNow = false;

    if (deliveryStatus === 'DELIVERED') {
      const needsPayment = orderNeedsPaymentOnDelivery(existing);
      if (needsPayment && !completion) {
        throw new InvalidPaymentError('Payment is required when marking a delivery as delivered');
      }

      let completionInput: CompleteOrderInput | undefined;
      let riderCashToSettle = 0;
      if (needsPayment && completion) {
        const normalized = normalizeCompleteOrderInput(Number(existing.totalAmount), completion);
        riderCashToSettle = cashPaymentTotal(normalized.payments);
        completionInput = {
          ...normalized,
          completedById: actor.userId,
        };
      }

      const deductionPlan = await inventoryStockService.prepareDeduction(businessId, orderId);
      order = await getRawPrismaClient().$transaction(
        async (tx) => {
          const updated = await this.orderRepository.updateDeliveryStatus(
            businessId,
            orderId,
            deliveryStatus,
            tx,
          );

          let finalOrder = updated;
          if (needsPayment && completionInput) {
            finalOrder = await this.orderRepository.updateStatus(
              businessId,
              orderId,
              'COMPLETED',
              { completion: completionInput, actorId: actor.userId },
              tx,
            );
            if (riderCashToSettle > 0) {
              const riderId = existing.riderId ?? actor.userId;
              await cashShiftModule.riderCashSettlementRepository.createPending(tx, {
                businessId,
                orderId,
                riderId,
                amount: riderCashToSettle,
              });
            }
            completedNow = true;
          }

          if (deductionPlan) {
            await inventoryStockService.commitDeduction(deductionPlan, actor.userId, tx);
          }
          return finalOrder;
        },
        PRISMA_TRANSACTION_OPTIONS,
      );

      if (deductionPlan) {
        emitDomainEvent('inventory.stock_changed', { businessId, orderId });
      }

      if (completedNow) {
        emitDomainEvent('order.status_changed', {
          orderId: order.id,
          businessId,
          status: order.status,
          customerId: order.customerId,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
        });
      }
    } else {
      order = await this.orderRepository.updateDeliveryStatus(
        businessId,
        orderId,
        deliveryStatus,
      );
    }

    emitDomainEvent('order.delivery_updated', { orderId, businessId, deliveryStatus });

    await tenantAuditService.log({
      businessId,
      userId: actor.userId,
      action: 'delivery.status_updated',
      targetType: 'order',
      targetId: orderId,
      metadata: { deliveryStatus, userName: actor.userName },
    });

    return order;
  }
}

export class TransferOrderWaiterUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    businessId: string,
    orderId: string,
    waiterId: string,
    actor: { userId: string; userName?: string },
  ) {
    const order = await this.orderRepository.transferWaiter(businessId, orderId, waiterId);

    emitDomainEvent('order.waiter_transferred', { orderId, businessId, waiterId });

    await tenantAuditService.log({
      businessId,
      userId: actor.userId,
      action: 'order.waiter_transferred',
      targetType: 'order',
      targetId: orderId,
      metadata: { waiterId, userName: actor.userName },
    });

    return order;
  }
}

export class AssignTableWaiterUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    businessId: string,
    tableId: string,
    waiterId: string | null,
    actor: { userId: string; userName?: string },
  ) {
    await this.orderRepository.assignTableWaiter(businessId, tableId, waiterId);

    emitDomainEvent('table.waiter_assigned', { tableId, businessId, waiterId });

    await tenantAuditService.log({
      businessId,
      userId: actor.userId,
      action: waiterId ? 'table.waiter_assigned' : 'table.waiter_unassigned',
      targetType: 'table',
      targetId: tableId,
      metadata: { waiterId, userName: actor.userName },
    });
  }
}

export class CreateOrderChangeRequestUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    businessId: string,
    orderId: string,
    requestedById: string,
    input: CreateOrderChangeRequestInput,
    actor: { userName?: string },
  ) {
    const request = await this.orderRepository.createChangeRequest(
      businessId,
      orderId,
      requestedById,
      input,
    );

    emitDomainEvent('order.change_request_created', {
      orderId,
      businessId,
      requestId: request.id,
    });

    await tenantAuditService.log({
      businessId,
      userId: requestedById,
      action: 'order.change_request_created',
      targetType: 'order_change_request',
      targetId: request.id,
      metadata: { orderId, type: input.type, userName: actor.userName },
    });

    return request;
  }
}

export class ReviewOrderChangeRequestUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    businessId: string,
    orderId: string,
    requestId: string,
    reviewedById: string,
    input: ReviewOrderChangeRequestInput,
    actor: { userName?: string },
  ) {
    const request = await this.orderRepository.reviewChangeRequest(
      businessId,
      orderId,
      requestId,
      reviewedById,
      input,
    );

    emitDomainEvent('order.change_request_reviewed', {
      orderId,
      businessId,
      requestId,
      status: input.status,
    });

    await tenantAuditService.log({
      businessId,
      userId: reviewedById,
      action: 'order.change_request_reviewed',
      targetType: 'order_change_request',
      targetId: requestId,
      metadata: { orderId, status: input.status, userName: actor.userName },
    });

    return request;
  }
}

export class ListOrderChangeRequestsUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  execute(businessId: string, orderId: string) {
    return this.orderRepository.listChangeRequests(businessId, orderId);
  }
}
