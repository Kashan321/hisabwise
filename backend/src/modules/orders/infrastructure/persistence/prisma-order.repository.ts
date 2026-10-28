import { Prisma, TableStatus as PrismaTableStatus } from '@prisma/client';
import { DELIVERY_STATUS_TRANSITIONS } from '../../../../config/constants';
import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { getRawPrismaClient, prisma } from '../../../../shared/database/prisma-client';
import { PRISMA_TRANSACTION_OPTIONS } from '../../../../shared/database/prisma-transaction-options';
import { inventoryStockService } from '../../../inventory/application/services/inventory-stock.service';
import {
  allocateOrderTicketNumber,
  formatOrderTicketLabel,
  resolveOrderShiftContext,
} from '../../application/services/order-ticket.service';
import {
  CreateOrderChangeRequestInput,
  CreateOrderInput,
  CompleteOrderInput,
  DeliveryStatus,
  ListOrdersFilters,
  ListOrdersResult,
  OrderChangeRequestEntity,
  OrderEntity,
  OrderPricingResult,
  OrderStatus,
  PaymentMethod,
  OrderPaymentStatus,
  ReviewOrderChangeRequestInput,
} from '../../domain/entities/order.entity';
import { normalizeCompleteOrderInput } from '../../application/services/order-payment.service';
import {
  OrderRepository,
  UpdateOrderStatusOptions,
} from '../../domain/repositories/order.repository';
import {
  ChangeRequestNotFoundError,
  InvalidChangeRequestError,
  InvalidDeliveryStatusError,
  InvalidOrderItemError,
  InvalidOrderStatusError,
  OrderAlreadySentError,
  OrderIsDraftError,
  OrderNotModifiableError,
  OrderNotFoundError,
  StaffNotFoundError,
  TableNotAvailableError,
  TableNotFoundError,
} from '../../domain/errors/order.errors';
import { buildOrderListWhere } from './order-list.where-builder';
import { filesModule } from '../../../files/infrastructure/files.module';
import {
  assignNewItemsToKitchenTicket,
  createKitchenTicket,
  ensureKitchenTicketForOrder,
  clearActiveKitchenTicketsForOrder,
  syncOrderStatusFromKitchenTickets,
} from '../../../kitchen-display/application/services/kitchen-ticket.service';

function decimalToString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

const OPEN_TAB_ORDER_TYPES = new Set(['DINE_IN', 'TAKEAWAY']);
const ADD_ITEMS_STATUSES = new Set(['RECEIVED', 'PREPARING', 'READY']);

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertCanModifyOrderItems(order: {
  isDraft: boolean;
  orderType: string;
  status: string;
}) {
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
    throw new OrderNotModifiableError('Cannot modify a completed or cancelled order');
  }
  if (order.isDraft) return;
  if (!OPEN_TAB_ORDER_TYPES.has(order.orderType)) {
    throw new OrderNotModifiableError('Items can only be modified on dine-in or takeaway orders');
  }
  if (!ADD_ITEMS_STATUSES.has(order.status)) {
    throw new OrderNotModifiableError('Cannot modify items on this order');
  }
}

function assertCanUpdateOrderPricing(order: {
  status: string;
  paymentStatus: string | null;
}) {
  if (order.paymentStatus === 'PAID') {
    throw new OrderNotModifiableError('Cannot change pricing on a paid order');
  }
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
    throw new OrderNotModifiableError('Cannot change pricing on a completed or cancelled order');
  }
}

async function syncTableWaiterAssignment(
  tx: {
    order: { count: (args: { where: Record<string, unknown> }) => Promise<number> };
    floorTable: { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> };
  },
  businessId: string,
  tableId: string | null | undefined,
) {
  if (!tableId) return;
  const activeOnTable = await tx.order.count({
    where: {
      businessId,
      tableId,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
  });
  if (activeOnTable === 0) {
    await tx.floorTable.update({
      where: { id: tableId },
      data: { assignedWaiterId: null },
    });
  }
}

function recalculateTotalsAfterSubtotalChange(
  order: {
    subtotal: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    serviceAmount: Prisma.Decimal;
    deliveryAmount: Prisma.Decimal;
  },
  newSubtotal: number,
) {
  const oldSubtotal = Number(order.subtotal);
  const ratio = oldSubtotal > 0 ? newSubtotal / oldSubtotal : 0;
  const discountAmount = roundMoney(Number(order.discountAmount) * ratio);
  const taxAmount = roundMoney(Number(order.taxAmount) * ratio);
  const serviceAmount = roundMoney(Number(order.serviceAmount) * ratio);
  const deliveryAmount = roundMoney(Number(order.deliveryAmount));
  const totalAmount = roundMoney(
    newSubtotal - discountAmount + taxAmount + serviceAmount + deliveryAmount,
  );
  return {
    subtotal: newSubtotal,
    discountAmount,
    taxAmount,
    serviceAmount,
    deliveryAmount,
    totalAmount,
  };
}

function mapOrderItem(item: {
  id: string;
  menuItemId: string | null;
  menuItemName: string;
  variantId: string | null;
  variantName: string | null;
  variantPrice: Prisma.Decimal | null;
  quantity: number;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  weightG: number | null;
  unitPricePerKg: Prisma.Decimal | null;
  customizationNotes: string | null;
  isKitchenAddition: boolean;
  menuItem?: { imageUrl: string | null } | null;
  modifiers: Array<{
    id: string;
    modifierOptionId: string | null;
    modifierName: string;
    priceAdjustment: Prisma.Decimal;
  }>;
}) {
  return {
    id: item.id,
    menuItemId: item.menuItemId,
    menuItemName: item.menuItemName,
    variantId: item.variantId,
    variantName: item.variantName,
    variantPrice: item.variantPrice ? decimalToString(item.variantPrice) : null,
    imageUrl: item.menuItem?.imageUrl ?? null,
    quantity: item.quantity,
    unitPrice: decimalToString(item.unitPrice),
    lineTotal: decimalToString(item.lineTotal),
    weightG: item.weightG,
    unitPricePerKg: item.unitPricePerKg ? decimalToString(item.unitPricePerKg) : null,
    customizationNotes: item.customizationNotes,
    isKitchenAddition: item.isKitchenAddition,
    modifiers: item.modifiers.map((modifier) => ({
      id: modifier.id,
      modifierOptionId: modifier.modifierOptionId,
      modifierName: modifier.modifierName,
      priceAdjustment: decimalToString(modifier.priceAdjustment),
    })),
  };
}

function mapChangeRequest(request: {
  id: string;
  orderId: string;
  type: 'CANCEL_ORDER' | 'REMOVE_ITEM' | 'MODIFY_ITEM';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  payload: Prisma.JsonValue;
  reason: string | null;
  reviewNote: string | null;
  requestedById: string;
  reviewedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  requestedBy?: { name: string } | null;
  reviewedBy?: { name: string } | null;
}): OrderChangeRequestEntity {
  return {
    id: request.id,
    orderId: request.orderId,
    type: request.type,
    status: request.status,
    payload: (request.payload as Record<string, unknown> | null) ?? null,
    reason: request.reason,
    reviewNote: request.reviewNote,
    requestedById: request.requestedById,
    requestedByName: request.requestedBy?.name ?? null,
    reviewedById: request.reviewedById,
    reviewedByName: request.reviewedBy?.name ?? null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function mapOrderPayment(payment: {
  id: string;
  method: PaymentMethod;
  amount: Prisma.Decimal;
  amountReceived: Prisma.Decimal | null;
  changeGiven: Prisma.Decimal | null;
  referenceNumber: string | null;
  createdAt: Date;
}) {
  return {
    id: payment.id,
    method: payment.method,
    amount: decimalToString(payment.amount),
    amountReceived: payment.amountReceived ? decimalToString(payment.amountReceived) : null,
    changeGiven: payment.changeGiven ? decimalToString(payment.changeGiven) : null,
    referenceNumber: payment.referenceNumber,
    createdAt: payment.createdAt,
  };
}

function mapOrder(order: {
  id: string;
  businessId: string;
  tableId: string | null;
  customerId: string | null;
  promotionId: string | null;
  createdById: string | null;
  waiterId: string | null;
  riderId: string | null;
  source: 'QR_CUSTOMER' | 'STAFF_ASSISTED' | 'ONLINE_DELIVERY';
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'QR';
  status: OrderStatus;
  deliveryStatus: DeliveryStatus | null;
  isDraft: boolean;
  sentToKitchenAt: Date | null;
  paymentMethod: PaymentMethod | null;
  paymentStatus: OrderPaymentStatus | null;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  serviceAmount: Prisma.Decimal;
  deliveryAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  notes: string | null;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  ticketNumber: number | null;
  ticketPrefix: string | null;
  businessDayId?: string | null;
  cashShiftId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  table: { tableIdentifier: string } | null;
  promotion: { title: string } | null;
  waiter: { name: string } | null;
  rider: { name: string } | null;
  createdBy: { name: string } | null;
  preparedBy?: { name: string } | null;
  preparedById?: string | null;
  preparedAt?: Date | null;
  items: Array<Parameters<typeof mapOrderItem>[0]>;
  changeRequests?: Array<Parameters<typeof mapChangeRequest>[0]>;
  payments?: Array<Parameters<typeof mapOrderPayment>[0]>;
}): OrderEntity {
  return {
    id: order.id,
    businessId: order.businessId,
    tableId: order.tableId,
    tableIdentifier: order.table?.tableIdentifier ?? null,
    customerId: order.customerId,
    promotionId: order.promotionId,
    promotionTitle: order.promotion?.title ?? null,
    createdById: order.createdById,
    createdByName: order.createdBy?.name ?? null,
    waiterId: order.waiterId,
    waiterName: order.waiter?.name ?? null,
    riderId: order.riderId,
    riderName: order.rider?.name ?? null,
    source: order.source,
    orderType: order.orderType,
    status: order.status,
    deliveryStatus: order.deliveryStatus,
    isDraft: order.isDraft,
    sentToKitchenAt: order.sentToKitchenAt,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    payments: order.payments?.map(mapOrderPayment),
    subtotal: decimalToString(order.subtotal),
    discountAmount: decimalToString(order.discountAmount),
    taxAmount: decimalToString(order.taxAmount),
    serviceAmount: decimalToString(order.serviceAmount),
    deliveryAmount: decimalToString(order.deliveryAmount),
    totalAmount: decimalToString(order.totalAmount),
    notes: order.notes,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    deliveryNotes: order.deliveryNotes,
    ticketNumber: order.ticketNumber,
    ticketPrefix: order.ticketPrefix,
    ticketLabel:
      order.ticketNumber != null && order.ticketPrefix
        ? formatOrderTicketLabel(order.ticketPrefix, order.ticketNumber)
        : null,
    businessDayId: order.businessDayId ?? null,
    cashShiftId: order.cashShiftId ?? null,
    preparedById: order.preparedById ?? null,
    preparedByName: order.preparedBy?.name ?? null,
    preparedAt: order.preparedAt ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map(mapOrderItem),
    changeRequests: order.changeRequests?.map(mapChangeRequest),
  };
}

const storageUrlResolver = filesModule.storageUrlResolver;

async function mapOrderResolved(
  order: Parameters<typeof mapOrder>[0],
): Promise<OrderEntity> {
  return storageUrlResolver.resolveOrder(mapOrder(order));
}

const orderInclude = {
  table: { select: { tableIdentifier: true } },
  promotion: { select: { title: true } },
  waiter: { select: { name: true } },
  rider: { select: { name: true } },
  createdBy: { select: { name: true } },
  preparedBy: { select: { name: true } },
  payments: { orderBy: { createdAt: 'asc' as const } },
  items: {
    include: {
      modifiers: true,
      menuItem: { select: { imageUrl: true } },
    },
    orderBy: { menuItemName: 'asc' as const },
  },
} as const;

const orderListInclude = {
  table: { select: { tableIdentifier: true } },
  promotion: { select: { title: true } },
  waiter: { select: { name: true } },
  rider: { select: { name: true } },
  createdBy: { select: { name: true } },
  preparedBy: { select: { name: true } },
  payments: { orderBy: { createdAt: 'asc' as const } },
  items: {
    include: { modifiers: true },
    orderBy: { menuItemName: 'asc' as const },
  },
} as const;

const ORDER_LIST_DEFAULT_LIMIT = 150;

const changeRequestInclude = {
  requestedBy: { select: { name: true } },
  reviewedBy: { select: { name: true } },
} as const;

async function assertStaffMember(businessId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, businessId, isActive: true },
  });
  if (!user) throw new StaffNotFoundError();
  return user;
}

function isUpdateOrderStatusOptions(
  options: UpdateOrderStatusOptions | CompleteOrderInput,
): options is UpdateOrderStatusOptions {
  return 'completion' in options || 'actorId' in options;
}

function normalizeUpdateStatusOptions(
  options?: UpdateOrderStatusOptions | CompleteOrderInput | PaymentMethod,
): UpdateOrderStatusOptions {
  if (!options) return {};
  if (typeof options === 'string') {
    return { completion: options };
  }
  if (isUpdateOrderStatusOptions(options)) {
    return options;
  }
  return { completion: options };
}

async function resolveOrderCustomerId(
  tx: Prisma.TransactionClient,
  businessId: string,
  input: CreateOrderInput,
): Promise<string | undefined> {
  const name = input.customerName?.trim();
  const phone = input.customerPhone?.trim();
  const address = input.deliveryAddress?.trim();

  if (input.customerId) {
    const linked = await tx.customerProfile.findFirst({
      where: { id: input.customerId, businessId },
    });
    if (!linked) return undefined;

    const updates: { deliveryAddress?: string; name?: string; phoneNumber?: string } = {};
    if (address && address !== linked.deliveryAddress) {
      updates.deliveryAddress = address;
    }
    if (name && name !== linked.name) updates.name = name;
    if (phone && phone !== linked.phoneNumber) updates.phoneNumber = phone;

    if (Object.keys(updates).length > 0) {
      await tx.customerProfile.update({
        where: { id: linked.id },
        data: updates,
      });
    }

    return linked.id;
  }

  if (!name && !phone) return undefined;

  if (phone) {
    const byPhone = await tx.customerProfile.findFirst({
      where: { businessId, phoneNumber: phone },
    });
    if (byPhone) {
      const updates: { deliveryAddress?: string; name?: string } = {};
      if (address && address !== byPhone.deliveryAddress) {
        updates.deliveryAddress = address;
      }
      if (name && name !== byPhone.name) updates.name = name;

      if (Object.keys(updates).length > 0) {
        await tx.customerProfile.update({
          where: { id: byPhone.id },
          data: updates,
        });
      }

      return byPhone.id;
    }
  }

  const shouldCreate =
    input.orderType === 'DELIVERY' ? Boolean(name && phone) : Boolean(name || phone);
  if (!shouldCreate) return undefined;

  try {
    const created = await tx.customerProfile.create({
      data: {
        businessId,
        name: name || 'Customer',
        phoneNumber: phone || undefined,
        deliveryAddress: address || undefined,
      },
    });
    return created.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      phone
    ) {
      const existing = await tx.customerProfile.findFirst({
        where: { businessId, phoneNumber: phone },
      });
      return existing?.id;
    }
    throw error;
  }
}

export class PrismaOrderRepository implements OrderRepository {
  async create(
    businessId: string,
    input: CreateOrderInput,
    pricing: OrderPricingResult,
  ): Promise<OrderEntity> {
    if (input.tableId) {
      const table = await prisma.floorTable.findFirst({
        where: { id: input.tableId, businessId },
      });
      if (!table) throw new TableNotFoundError();
    }

    const isDraft = input.isDraft ?? false;

    const order = await getRawPrismaClient().$transaction(async (tx) => {
      const ticketData = isDraft ? null : await allocateOrderTicketNumber(tx, businessId);
      const shiftContext = isDraft ? null : await resolveOrderShiftContext(tx, businessId);
      const resolvedCustomerId = await resolveOrderCustomerId(tx, businessId, input);

      const created = await tx.order.create({
        data: {
          businessId,
          businessDayId: ticketData?.businessDayId ?? null,
          cashShiftId: shiftContext?.cashShiftId ?? null,
          tableId: input.tableId,
          customerId: resolvedCustomerId,
          promotionId: pricing.promotionId,
          createdById: input.createdById,
          waiterId: input.waiterId,
          source: input.source,
          orderType: input.orderType ?? 'DINE_IN',
          isDraft,
          status: isDraft ? 'RECEIVED' : 'RECEIVED',
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          deliveryAddress: input.deliveryAddress,
          deliveryNotes: input.deliveryNotes,
          deliveryStatus: input.orderType === 'DELIVERY' && !isDraft ? null : undefined,
          ticketNumber: ticketData?.ticketNumber,
          ticketPrefix: ticketData?.ticketPrefix,
          subtotal: pricing.subtotal,
          discountAmount: pricing.discountAmount,
          taxAmount: pricing.taxAmount,
          serviceAmount: pricing.serviceAmount,
          deliveryAmount: pricing.deliveryAmount,
          totalAmount: pricing.totalAmount,
          notes: input.notes,
          items: {
            create: pricing.items.map((item) => ({
              menuItemId: item.menuItemId,
              menuItemName: item.menuItemName,
              variantId: item.variantId,
              variantName: item.variantName,
              variantPrice: item.variantPrice,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
              weightG: item.weightG,
              unitPricePerKg: item.unitPricePerKg,
              customizationNotes: item.customizationNotes,
              modifiers: {
                create: item.modifiers.map((modifier) => ({
                  modifierOptionId: modifier.modifierOptionId,
                  modifierName: modifier.modifierName,
                  priceAdjustment: modifier.priceAdjustment,
                })),
              },
            })),
          },
        },
        include: orderInclude,
      });

      if (input.tableId) {
        await tx.floorTable.update({
          where: { id: input.tableId },
          data: {
            ...(input.waiterId ? { assignedWaiterId: input.waiterId } : {}),
            ...(!isDraft ? { status: PrismaTableStatus.OCCUPIED } : {}),
          },
        });
      }

      if (!isDraft) {
        await createKitchenTicket(tx, {
          businessId,
          orderId: created.id,
          itemIds: created.items.map((item) => item.id),
        });
      }

      return created;
    }, PRISMA_TRANSACTION_OPTIONS);

    return mapOrderResolved(order);
  }

  async findAll(businessId: string, filters?: ListOrdersFilters): Promise<ListOrdersResult> {
    const where = buildOrderListWhere(businessId, filters);
    const take = Math.min(filters?.limit ?? ORDER_LIST_DEFAULT_LIMIT, 200);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: orderListInclude,
        orderBy: { createdAt: 'desc' },
        take,
      }),
      prisma.order.count({ where }),
    ]);
    return { orders: orders.map(mapOrder), total };
  }

  async findById(
    businessId: string,
    orderId: string,
    options?: { includeChangeRequests?: boolean },
  ): Promise<OrderEntity | null> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: {
        ...orderInclude,
        ...(options?.includeChangeRequests
          ? {
              changeRequests: {
                include: changeRequestInclude,
                orderBy: { createdAt: 'desc' as const },
              },
            }
          : {}),
      },
    });
    return order ? await mapOrderResolved(order) : null;
  }

  async updateStatus(
    businessId: string,
    orderId: string,
    status: OrderStatus,
    options?: UpdateOrderStatusOptions | CompleteOrderInput | PaymentMethod,
    tx?: Prisma.TransactionClient,
  ): Promise<OrderEntity> {
    const client = tx ?? prisma;
    const existing = await client.order.findFirst({ where: { id: orderId, businessId } });
    if (!existing) throw new OrderNotFoundError();

    if (existing.isDraft) {
      if (status !== 'CANCELLED') {
        throw new OrderIsDraftError();
      }
      const order = await client.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', isDraft: false },
        include: orderInclude,
      });
      if (existing.tableId) {
        await client.floorTable.update({
          where: { id: existing.tableId },
          data: { status: PrismaTableStatus.AVAILABLE },
        });
        await syncTableWaiterAssignment(client, businessId, existing.tableId);
      }
      return mapOrderResolved(order);
    }

    const updateOptions = normalizeUpdateStatusOptions(options);
    const actorId = updateOptions.actorId;
    const completion = updateOptions.completion;

    let completionData:
      | (CompleteOrderInput & {
          payments: NonNullable<CompleteOrderInput['payments']>;
          paymentStatus: OrderPaymentStatus;
          paymentMethod: PaymentMethod;
        })
      | undefined;

    if (status === 'COMPLETED') {
      completionData = normalizeCompleteOrderInput(Number(existing.totalAmount), completion);
    }

    const shouldAttributeChef =
      !!actorId &&
      (status === 'PREPARING' || (status === 'READY' && !existing.preparedById));

    const order = await client.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(shouldAttributeChef
          ? {
              preparedById: actorId,
              preparedAt: new Date(),
            }
          : {}),
        ...(completionData
          ? {
              paymentMethod: completionData.paymentMethod,
              paymentStatus: completionData.paymentStatus,
              cashShiftId: completionData.cashShiftId ?? null,
              completedById: completionData.completedById ?? null,
              payments: {
                create: completionData.payments.map((line) => ({
                  businessId,
                  method: line.method,
                  amount: line.amount,
                  amountReceived: line.amountReceived ?? null,
                  changeGiven: line.changeGiven ?? null,
                  referenceNumber: line.referenceNumber ?? null,
                  cashShiftId: completionData!.cashShiftId ?? null,
                  createdById: completionData.completedById ?? null,
                })),
              },
            }
          : {}),
      },
      include: orderInclude,
    });

    if (status === 'COMPLETED' && existing.tableId) {
      await client.floorTable.update({
        where: { id: existing.tableId },
        data: { status: PrismaTableStatus.AVAILABLE },
      });
    }

    if ((status === 'COMPLETED' || status === 'CANCELLED') && existing.tableId) {
      await syncTableWaiterAssignment(client, businessId, existing.tableId);
    }

    if (status === 'COMPLETED' || status === 'CANCELLED') {
      await clearActiveKitchenTicketsForOrder(client, orderId);
    }

    return mapOrderResolved(order);
  }

  async addItems(
    businessId: string,
    orderId: string,
    pricing: OrderPricingResult,
  ): Promise<OrderEntity> {
    const existing = await prisma.order.findFirst({ where: { id: orderId, businessId } });
    if (!existing) throw new OrderNotFoundError();
    assertCanModifyOrderItems(existing);

    const order = await getRawPrismaClient().$transaction(async (tx) => {
      const newItemIds: string[] = [];
      for (const item of pricing.items) {
        const createdItem = await tx.orderItem.create({
          data: {
            orderId,
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            variantId: item.variantId,
            variantName: item.variantName,
            variantPrice: item.variantPrice,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            weightG: item.weightG,
            unitPricePerKg: item.unitPricePerKg,
            customizationNotes: item.customizationNotes,
            isKitchenAddition: true,
            modifiers: {
              create: item.modifiers.map((modifier) => ({
                modifierOptionId: modifier.modifierOptionId,
                modifierName: modifier.modifierName,
                priceAdjustment: modifier.priceAdjustment,
              })),
            },
          },
        });
        newItemIds.push(createdItem.id);
      }

      if (newItemIds.length > 0) {
        await assignNewItemsToKitchenTicket(tx, {
          businessId,
          orderId,
          orderStatus: existing.status,
          itemIds: newItemIds,
        });
        await syncOrderStatusFromKitchenTickets(tx, orderId);
      }

      const newSubtotal = Number(existing.subtotal) + pricing.subtotal;
      const newDiscount = Number(existing.discountAmount) + pricing.discountAmount;
      const newTax = Number(existing.taxAmount) + pricing.taxAmount;
      const newService = Number(existing.serviceAmount) + pricing.serviceAmount;
      const newTotal = Number(existing.totalAmount) + pricing.totalAmount;

      return tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: newSubtotal,
          discountAmount: newDiscount,
          taxAmount: newTax,
          serviceAmount: newService,
          totalAmount: newTotal,
        },
        include: orderInclude,
      });
    }, PRISMA_TRANSACTION_OPTIONS);

    return mapOrderResolved(order);
  }

  async updatePricing(
    businessId: string,
    orderId: string,
    pricing: OrderPricingResult,
    notes?: string,
  ): Promise<OrderEntity> {
    const existing = await prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: { items: true },
    });
    if (!existing) throw new OrderNotFoundError();
    assertCanUpdateOrderPricing(existing);

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        promotionId: pricing.promotionId ?? null,
        subtotal: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        taxAmount: pricing.taxAmount,
        serviceAmount: pricing.serviceAmount,
        deliveryAmount: pricing.deliveryAmount,
        totalAmount: pricing.totalAmount,
        ...(notes !== undefined ? { notes } : {}),
      },
      include: orderInclude,
    });

    return mapOrderResolved(order);
  }

  async adjustOrderItemQuantity(
    businessId: string,
    orderId: string,
    orderItemId: string,
    delta: number,
  ): Promise<OrderEntity> {
    const existing = await prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: { items: true },
    });
    if (!existing) throw new OrderNotFoundError();
    assertCanModifyOrderItems(existing);

    const item = existing.items.find((row) => row.id === orderItemId);
    if (!item) throw new InvalidOrderItemError('Order item not found');

    const nextQty = item.quantity + delta;
    if (nextQty < 0) {
      throw new InvalidOrderItemError('Quantity cannot be negative');
    }

    if (nextQty === 0 && existing.items.length === 1) {
      throw new OrderNotModifiableError('Cannot remove the last item from an order');
    }

    const order = await prisma.$transaction(async (tx) => {
      if (nextQty === 0) {
        await tx.orderItem.delete({ where: { id: orderItemId } });
        const newSubtotal = roundMoney(Number(existing.subtotal) - Number(item.lineTotal));
        await tx.order.update({
          where: { id: orderId },
          data: recalculateTotalsAfterSubtotalChange(existing, newSubtotal),
        });
      } else {
        const unitPrice = Number(item.unitPrice);
        const newLineTotal = roundMoney(unitPrice * nextQty);
        const subtotalDelta = newLineTotal - Number(item.lineTotal);
        const newSubtotal = roundMoney(Number(existing.subtotal) + subtotalDelta);
        await tx.orderItem.update({
          where: { id: orderItemId },
          data: { quantity: nextQty, lineTotal: newLineTotal },
        });
        await tx.order.update({
          where: { id: orderId },
          data: recalculateTotalsAfterSubtotalChange(existing, newSubtotal),
        });
      }

      const updated = await tx.order.findFirst({
        where: { id: orderId, businessId },
        include: orderInclude,
      });
      if (!updated) throw new OrderNotFoundError();
      return updated;
    });

    return mapOrderResolved(order);
  }

  async sendToKitchen(businessId: string, orderId: string): Promise<OrderEntity> {
    const existing = await prisma.order.findFirst({ where: { id: orderId, businessId } });
    if (!existing) throw new OrderNotFoundError();
    if (!existing.isDraft) throw new OrderAlreadySentError();

    const order = await getRawPrismaClient().$transaction(async (tx) => {
      const ticketData =
        existing.ticketNumber == null ? await allocateOrderTicketNumber(tx, businessId) : null;
      const shiftContext =
        existing.ticketNumber == null ? await resolveOrderShiftContext(tx, businessId) : null;

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          isDraft: false,
          sentToKitchenAt: new Date(),
          status: 'RECEIVED',
          ...(ticketData
            ? {
                ticketNumber: ticketData.ticketNumber,
                ticketPrefix: ticketData.ticketPrefix,
                businessDayId: ticketData.businessDayId,
                cashShiftId: shiftContext?.cashShiftId ?? null,
              }
            : {}),
          ...(existing.orderType === 'DELIVERY' ? { deliveryStatus: null } : {}),
        },
        include: orderInclude,
      });

      if (existing.tableId) {
        await tx.floorTable.update({
          where: { id: existing.tableId },
          data: { status: PrismaTableStatus.OCCUPIED },
        });
      }

      const ticketId = await ensureKitchenTicketForOrder(tx, businessId, orderId);
      await tx.orderItem.updateMany({
        where: { orderId, kitchenTicketId: null },
        data: { kitchenTicketId: ticketId },
      });

      return updated;
    }, PRISMA_TRANSACTION_OPTIONS);

    return mapOrderResolved(order);
  }

  async assignRider(businessId: string, orderId: string, riderId: string): Promise<OrderEntity> {
    const existing = await prisma.order.findFirst({ where: { id: orderId, businessId } });
    if (!existing) throw new OrderNotFoundError();
    if (existing.orderType !== 'DELIVERY') {
      throw new InvalidOrderStatusError('Only delivery orders can be assigned a rider');
    }

    await assertStaffMember(businessId, riderId);

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        riderId,
        deliveryStatus: 'ASSIGNED',
      },
      include: orderInclude,
    });

    return mapOrderResolved(order);
  }

  async updateDeliveryStatus(
    businessId: string,
    orderId: string,
    deliveryStatus: DeliveryStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<OrderEntity> {
    const client = tx ?? prisma;
    const existing = await client.order.findFirst({ where: { id: orderId, businessId } });
    if (!existing) throw new OrderNotFoundError();
    if (existing.orderType !== 'DELIVERY') {
      throw new InvalidOrderStatusError('Order is not a delivery order');
    }
    if (!existing.riderId) {
      throw new InvalidDeliveryStatusError('Order has no assigned rider');
    }

    const current = existing.deliveryStatus;
    if (current) {
      const allowed = DELIVERY_STATUS_TRANSITIONS[current] ?? [];
      if (!allowed.includes(deliveryStatus)) {
        throw new InvalidDeliveryStatusError(
          `Cannot transition delivery status from ${current} to ${deliveryStatus}`,
        );
      }
    } else if (deliveryStatus !== 'ASSIGNED') {
      throw new InvalidDeliveryStatusError('Delivery must be assigned before updating status');
    }

    const order = await client.order.update({
      where: { id: orderId },
      data: { deliveryStatus },
      include: orderInclude,
    });

    return mapOrderResolved(order);
  }

  async transferWaiter(businessId: string, orderId: string, waiterId: string): Promise<OrderEntity> {
    const existing = await prisma.order.findFirst({ where: { id: orderId, businessId } });
    if (!existing) throw new OrderNotFoundError();

    await assertStaffMember(businessId, waiterId);

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { waiterId },
      include: orderInclude,
    });

    return mapOrderResolved(order);
  }

  async transferOrderTable(
    businessId: string,
    orderId: string,
    targetTableId: string,
  ): Promise<OrderEntity> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: { items: true },
    });
    if (!order) throw new OrderNotFoundError();
    if (!order.tableId) {
      throw new InvalidOrderStatusError('Order is not linked to a table');
    }
    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new InvalidOrderStatusError('Cannot move a closed order');
    }

    const target = await prisma.floorTable.findFirst({
      where: { id: targetTableId, businessId },
    });
    if (!target) throw new TableNotFoundError();
    if (target.id === order.tableId) return mapOrderResolved(order);

    const blocking = await prisma.order.findFirst({
      where: {
        businessId,
        tableId: targetTableId,
        isDraft: false,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });
    if (blocking) throw new TableNotAvailableError();

    if (target.status !== PrismaTableStatus.AVAILABLE) {
      throw new TableNotAvailableError('Target table must be free');
    }

    const sourceTableId = order.tableId;

    const updated = await getRawPrismaClient().$transaction(async (tx) => {
      await tx.floorTable.update({
        where: { id: sourceTableId },
        data: { status: PrismaTableStatus.AVAILABLE, assignedWaiterId: null },
      });
      await tx.floorTable.update({
        where: { id: targetTableId },
        data: { status: PrismaTableStatus.OCCUPIED },
      });
      return tx.order.update({
        where: { id: orderId },
        data: { tableId: targetTableId },
        include: orderInclude,
      });
    }, PRISMA_TRANSACTION_OPTIONS);

    emitDomainEvent('table.status_changed', { businessId, tableId: sourceTableId });
    emitDomainEvent('table.status_changed', { businessId, tableId: targetTableId });
    emitDomainEvent('order.table_transferred', { businessId, orderId, targetTableId, sourceTableId });

    return mapOrderResolved(updated);
  }

  async mergeOrders(
    businessId: string,
    targetOrderId: string,
    sourceOrderId: string,
  ): Promise<OrderEntity> {
    if (targetOrderId === sourceOrderId) {
      throw new InvalidOrderStatusError('Choose a different table to merge');
    }

    const [target, source] = await Promise.all([
      prisma.order.findFirst({
        where: { id: targetOrderId, businessId },
        include: { items: { include: { modifiers: true } } },
      }),
      prisma.order.findFirst({
        where: { id: sourceOrderId, businessId },
        include: { items: { include: { modifiers: true } } },
      }),
    ]);
    if (!target || !source) throw new OrderNotFoundError();
    if (['COMPLETED', 'CANCELLED'].includes(target.status) || ['COMPLETED', 'CANCELLED'].includes(source.status)) {
      throw new InvalidOrderStatusError('Cannot merge closed orders');
    }
    if (!target.tableId || !source.tableId) {
      throw new InvalidOrderStatusError('Both orders must be dine-in table orders');
    }

    const updated = await getRawPrismaClient().$transaction(async (tx) => {
      for (const item of source.items) {
        const created = await tx.orderItem.create({
          data: {
            orderId: targetOrderId,
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            variantId: item.variantId,
            variantName: item.variantName,
            variantPrice: item.variantPrice,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            weightG: item.weightG,
            unitPricePerKg: item.unitPricePerKg,
            customizationNotes: item.customizationNotes,
            isKitchenAddition: true,
            modifiers: {
              create: item.modifiers.map((m) => ({
                modifierOptionId: m.modifierOptionId,
                modifierName: m.modifierName,
                priceAdjustment: m.priceAdjustment,
              })),
            },
          },
        });
        await assignNewItemsToKitchenTicket(tx, {
          businessId,
          orderId: targetOrderId,
          orderStatus: target.status,
          itemIds: [created.id],
        });
      }

      const merged = await tx.order.update({
        where: { id: targetOrderId },
        data: {
          subtotal: Number(target.subtotal) + Number(source.subtotal),
          discountAmount: Number(target.discountAmount) + Number(source.discountAmount),
          taxAmount: Number(target.taxAmount) + Number(source.taxAmount),
          serviceAmount: Number(target.serviceAmount) + Number(source.serviceAmount),
          deliveryAmount: Number(target.deliveryAmount) + Number(source.deliveryAmount),
          totalAmount: Number(target.totalAmount) + Number(source.totalAmount),
        },
        include: orderInclude,
      });

      await tx.order.update({
        where: { id: sourceOrderId },
        data: { status: 'CANCELLED' },
      });

      await tx.floorTable.update({
        where: { id: source.tableId },
        data: { status: PrismaTableStatus.AVAILABLE, assignedWaiterId: null },
      });

      await clearActiveKitchenTicketsForOrder(tx, sourceOrderId);
      await syncTableWaiterAssignment(tx, businessId, source.tableId);

      return merged;
    }, PRISMA_TRANSACTION_OPTIONS);

    emitDomainEvent('table.status_changed', { businessId, tableId: source.tableId });
    emitDomainEvent('order.tables_merged', {
      businessId,
      targetOrderId,
      sourceOrderId,
      sourceTableId: source.tableId,
    });

    return mapOrderResolved(updated);
  }

  async assignTableWaiter(
    businessId: string,
    tableId: string,
    waiterId: string | null,
  ): Promise<void> {
    const table = await prisma.floorTable.findFirst({ where: { id: tableId, businessId } });
    if (!table) throw new TableNotFoundError();

    if (waiterId) {
      await assertStaffMember(businessId, waiterId);
    }

    await prisma.floorTable.update({
      where: { id: tableId },
      data: { assignedWaiterId: waiterId },
    });
  }

  async createChangeRequest(
    businessId: string,
    orderId: string,
    requestedById: string,
    input: CreateOrderChangeRequestInput,
  ): Promise<OrderChangeRequestEntity> {
    const order = await prisma.order.findFirst({ where: { id: orderId, businessId } });
    if (!order) throw new OrderNotFoundError();
    if (order.isDraft) throw new OrderIsDraftError();
    if (!['PREPARING', 'READY', 'RECEIVED'].includes(order.status)) {
      throw new InvalidChangeRequestError('Change requests can only be made for active kitchen orders');
    }

    const request = await prisma.orderChangeRequest.create({
      data: {
        businessId,
        orderId,
        requestedById,
        type: input.type,
        reason: input.reason,
        payload: input.payload,
      },
      include: changeRequestInclude,
    });

    return mapChangeRequest(request);
  }

  async reviewChangeRequest(
    businessId: string,
    orderId: string,
    requestId: string,
    reviewedById: string,
    input: ReviewOrderChangeRequestInput,
  ): Promise<OrderChangeRequestEntity> {
    const request = await prisma.orderChangeRequest.findFirst({
      where: { id: requestId, orderId, businessId },
    });
    if (!request) throw new ChangeRequestNotFoundError();
    if (request.status !== 'PENDING') {
      throw new InvalidChangeRequestError('Change request has already been reviewed');
    }

    const reversalPlan =
      input.status === 'APPROVED' && request.type === 'CANCEL_ORDER'
        ? await inventoryStockService.prepareReversal(businessId, orderId)
        : null;

    const updated = await getRawPrismaClient().$transaction(
      async (tx) => {
        const reviewed = await tx.orderChangeRequest.update({
          where: { id: requestId },
          data: {
            status: input.status,
            reviewNote: input.reviewNote,
            reviewedById,
          },
          include: changeRequestInclude,
        });

        if (input.status === 'APPROVED') {
          if (request.type === 'CANCEL_ORDER') {
            if (reversalPlan) {
              await inventoryStockService.commitReversal(reversalPlan, reviewedById, tx);
            }
            const cancelled = await tx.order.update({
              where: { id: orderId },
              data: { status: 'CANCELLED' },
            });
            if (cancelled.tableId) {
              await syncTableWaiterAssignment(tx, businessId, cancelled.tableId);
            }
          } else if (request.type === 'REMOVE_ITEM') {
            const payload = request.payload as { orderItemId?: string } | null;
            if (payload?.orderItemId) {
              await tx.orderItem.deleteMany({
                where: { id: payload.orderItemId, orderId },
              });
            }
          }
        }

        return reviewed;
      },
      PRISMA_TRANSACTION_OPTIONS,
    );

    if (reversalPlan) {
      emitDomainEvent('inventory.stock_changed', { businessId, orderId });
    }

    return mapChangeRequest(updated);
  }

  async listChangeRequests(businessId: string, orderId: string): Promise<OrderChangeRequestEntity[]> {
    const order = await prisma.order.findFirst({ where: { id: orderId, businessId } });
    if (!order) throw new OrderNotFoundError();

    const requests = await prisma.orderChangeRequest.findMany({
      where: { businessId, orderId },
      include: changeRequestInclude,
      orderBy: { createdAt: 'desc' },
    });

    return requests.map(mapChangeRequest);
  }
}
