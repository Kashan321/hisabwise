import { prisma } from '../../../../shared/database/prisma-client';
import { ordersModule } from '../../../orders/infrastructure/orders.module';
import { CreateOrderInput, CompleteOrderInput } from '../../../orders/domain/entities/order.entity';
import { posDeviceRepository } from '../../infrastructure/persistence/pos-device.repository';
import type { SyncOfflineOrderInput } from '../../presentation/http/pos-offline.validators';
import { formatOfflinePrismaUserError } from '../../../../shared/database/verify-offline-prisma';

export type SyncOfflineOrderResult = {
  idempotencyKey: string;
  success: boolean;
  idempotentReplay: boolean;
  offlineTicketLabel?: string;
  serverTicketLabel?: string | null;
  orderId?: string;
  syncConflictFlags?: Record<string, unknown> | null;
  error?: string;
};

type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

const STATUS_FLOW: OrderStatus[] = ['RECEIVED', 'PREPARING', 'READY', 'COMPLETED'];

function formatTicketLabel(prefix: string | null | undefined, number: number | null | undefined) {
  if (number == null) return null;
  return prefix ? `${prefix}-${String(number).padStart(3, '0')}` : String(number);
}

function detectPricingConflicts(
  input: SyncOfflineOrderInput,
  pricedItems: Array<{ menuItemId: string; unitPrice: string | number }>,
): Record<string, unknown> | null {
  const snapshot = input.snapshotLineUnitPrices;
  if (!snapshot) return null;
  const conflicts: Array<{ menuItemId: string; snapshotPrice: string; serverPrice: string }> = [];
  for (const line of pricedItems) {
    const snap = snapshot[line.menuItemId];
    if (snap == null) continue;
    const server = String(line.unitPrice);
    if (snap !== server) {
      conflicts.push({ menuItemId: line.menuItemId, snapshotPrice: snap, serverPrice: server });
    }
  }
  if (!conflicts.length) return null;
  return { pricingDrift: conflicts, keepOfflinePricing: true };
}

async function completeWithCash(
  businessId: string,
  orderId: string,
  actorId: string,
  totalAmount: number,
  cash?: SyncOfflineOrderInput['completeWithCash'],
) {
  const payments: CompleteOrderInput['payments'] = [
    {
      method: 'CASH',
      amount: totalAmount,
      amountReceived: cash?.amountReceived ?? totalAmount,
      changeGiven: cash?.changeGiven ?? 0,
    },
  ];
  await ordersModule.updateOrderStatus.execute(businessId, orderId, 'READY', undefined, actorId);
  return ordersModule.updateOrderStatus.execute(
    businessId,
    orderId,
    'COMPLETED',
    { paymentMethod: 'CASH', paymentStatus: 'PAID', payments },
    actorId,
  );
}

async function advanceOpenOrderStatus(
  businessId: string,
  orderId: string,
  actorId: string,
  target: OrderStatus,
) {
  if (target === 'CANCELLED') {
    await ordersModule.updateOrderStatus.execute(businessId, orderId, 'CANCELLED', undefined, actorId);
    return;
  }
  const targetIndex = STATUS_FLOW.indexOf(target);
  if (targetIndex < 0) return;
  let order = await ordersModule.getOrder.execute(businessId, orderId);
  if (!order) return;
  while (order && order.status !== target && order.status !== 'COMPLETED' && order.status !== 'CANCELLED') {
    const currentIndex = STATUS_FLOW.indexOf(order.status as OrderStatus);
    const next = STATUS_FLOW[currentIndex + 1];
    if (!next || STATUS_FLOW.indexOf(next) > targetIndex) break;
    order = await ordersModule.updateOrderStatus.execute(businessId, orderId, next, undefined, actorId);
  }
}

function resolveClientItemId(
  items: Array<{ id: string; menuItemId: string | null }>,
  clientItemId: string,
  menuItemId: string,
): string | null {
  const direct = items.find((line) => line.id === clientItemId);
  if (direct) return direct.id;
  const matches = items.filter((line) => line.menuItemId === menuItemId);
  if (matches.length === 1) return matches[0].id;
  const offlineIndex = clientItemId.match(/^offline-(\d+)$/);
  if (offlineIndex) {
    const idx = Number(offlineIndex[1]);
    return matches[idx]?.id ?? items[idx]?.id ?? null;
  }
  return matches[0]?.id ?? null;
}

export class SyncOfflineOrdersBatchUseCase {
  async execute(
    businessId: string,
    actorId: string,
    orders: SyncOfflineOrderInput[],
  ): Promise<SyncOfflineOrderResult[]> {
    const results: SyncOfflineOrderResult[] = [];

    for (const item of orders) {
      const base: SyncOfflineOrderResult = {
        idempotencyKey: item.idempotencyKey,
        success: false,
        idempotentReplay: false,
        offlineTicketLabel: item.offlineTicketLabel,
      };

      try {
        let posDeviceId: string | undefined;
        if (item.deviceKey) {
          const device = await posDeviceRepository.findByDeviceKey(businessId, item.deviceKey);
          posDeviceId = device?.id;
          if (device && item.offlineTicketNumber != null) {
            await posDeviceRepository.bumpOfflineTicketCursor(
              device.id,
              item.offlineTicketNumber,
            );
          }
        }

        let order =
          (await ordersModule.getOrderByIdempotencyKey.execute(businessId, item.idempotencyKey)) ??
          null;
        let idempotentReplay = false;

        if (!order) {
          const input: CreateOrderInput = {
            ...item,
            createdById: actorId,
            isDraft: item.isDraft ?? false,
          };
          const created = await ordersModule.createOrder.execute(businessId, input);
          order = created.order;
          idempotentReplay = created.idempotentReplay;
        } else {
          idempotentReplay = true;
        }

        const pricedLines = (order.items ?? [])
          .filter((line) => line.menuItemId)
          .map((line) => ({
            menuItemId: line.menuItemId as string,
            unitPrice: line.unitPrice,
          }));
        const conflictFlags = detectPricingConflicts(item, pricedLines);

        if (conflictFlags || item.offlineTicketLabel || posDeviceId) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              posDeviceId: posDeviceId ?? undefined,
              offlineTicketLabel: item.offlineTicketLabel ?? undefined,
              syncConflictFlags: conflictFlags ?? undefined,
            },
          });
        }

        for (const update of item.itemUpdates ?? []) {
          order = await ordersModule.addOrderItems.execute(
            businessId,
            order.id,
            update,
            { userId: actorId },
          );
        }

        if (item.replaySendToKitchen && order.isDraft) {
          order = await ordersModule.sendOrderToKitchen.execute(businessId, order.id, {
            userId: actorId,
          });
        }

        for (const adjustment of item.offlineItemAdjustments ?? []) {
          const serverItemId = resolveClientItemId(
            order.items ?? [],
            adjustment.clientItemId,
            adjustment.menuItemId,
          );
          if (!serverItemId) continue;
          order = await ordersModule.adjustOrderItemQuantity.execute(
            businessId,
            order.id,
            serverItemId,
            adjustment.delta,
            { userId: actorId },
          );
        }

        for (const pricing of item.offlinePricingUpdates ?? []) {
          order = await ordersModule.updateOrderPricing.execute(businessId, order.id, pricing, {
            userId: actorId,
          });
        }

        if (item.completeWithCash && order.status !== 'COMPLETED' && !order.isDraft) {
          order = await completeWithCash(
            businessId,
            order.id,
            actorId,
            Number(order.totalAmount),
            item.completeWithCash,
          );
        } else if (item.offlineOrderStatus) {
          await advanceOpenOrderStatus(businessId, order.id, actorId, item.offlineOrderStatus);
          const refreshed = await ordersModule.getOrder.execute(businessId, order.id);
          if (refreshed) order = refreshed;
        } else if (conflictFlags || item.offlineTicketLabel || posDeviceId) {
          const refreshed = await ordersModule.getOrder.execute(businessId, order.id);
          if (refreshed) order = refreshed;
        }

        results.push({
          ...base,
          success: true,
          idempotentReplay,
          orderId: order.id,
          serverTicketLabel: formatTicketLabel(order.ticketPrefix, order.ticketNumber),
          syncConflictFlags: (conflictFlags as Record<string, unknown>) ?? null,
        });
      } catch (err) {
        const message =
          formatOfflinePrismaUserError(err) ??
          (err instanceof Error ? err.message : 'Sync failed');
        const existing = await ordersModule.getOrderByIdempotencyKey.execute(
          businessId,
          item.idempotencyKey,
        );
        if (existing) {
          results.push({
            ...base,
            success: true,
            idempotentReplay: true,
            orderId: existing.id,
            serverTicketLabel: formatTicketLabel(existing.ticketPrefix, existing.ticketNumber),
          });
        } else {
          results.push({ ...base, error: message });
        }
      }
    }

    return results;
  }
}