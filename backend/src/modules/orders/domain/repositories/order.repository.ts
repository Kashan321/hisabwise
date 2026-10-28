import {
  AddOrderItemsInput,
  CompleteOrderInput,
  CreateOrderChangeRequestInput,
  CreateOrderInput,
  UpdateOrderPricingInput,
  DeliveryStatus,
  ListOrdersFilters,
  ListOrdersResult,
  OrderChangeRequestEntity,
  OrderEntity,
  OrderStatus,
  PaymentMethod,
  ReviewOrderChangeRequestInput,
} from '../entities/order.entity';

export interface UpdateOrderStatusOptions {
  completion?: CompleteOrderInput | PaymentMethod;
  actorId?: string;
}

export interface OrderRepository {
  create(
    businessId: string,
    input: CreateOrderInput,
    pricing: import('../entities/order.entity').OrderPricingResult,
  ): Promise<OrderEntity>;
  findAll(businessId: string, filters?: ListOrdersFilters): Promise<ListOrdersResult>;
  findById(businessId: string, orderId: string, options?: { includeChangeRequests?: boolean }): Promise<OrderEntity | null>;
  updateStatus(
    businessId: string,
    orderId: string,
    status: OrderStatus,
    options?: UpdateOrderStatusOptions | CompleteOrderInput | PaymentMethod,
    tx?: import('@prisma/client').Prisma.TransactionClient,
  ): Promise<OrderEntity>;
  addItems(
    businessId: string,
    orderId: string,
    pricing: import('../entities/order.entity').OrderPricingResult,
  ): Promise<OrderEntity>;
  updatePricing(
    businessId: string,
    orderId: string,
    pricing: import('../entities/order.entity').OrderPricingResult,
    notes?: string,
  ): Promise<OrderEntity>;
  adjustOrderItemQuantity(
    businessId: string,
    orderId: string,
    orderItemId: string,
    delta: number,
  ): Promise<OrderEntity>;
  sendToKitchen(businessId: string, orderId: string): Promise<OrderEntity>;
  assignRider(businessId: string, orderId: string, riderId: string): Promise<OrderEntity>;
  updateDeliveryStatus(
    businessId: string,
    orderId: string,
    deliveryStatus: DeliveryStatus,
    tx?: import('@prisma/client').Prisma.TransactionClient,
  ): Promise<OrderEntity>;
  transferWaiter(businessId: string, orderId: string, waiterId: string): Promise<OrderEntity>;
  transferOrderTable(
    businessId: string,
    orderId: string,
    targetTableId: string,
  ): Promise<OrderEntity>;
  mergeOrders(
    businessId: string,
    targetOrderId: string,
    sourceOrderId: string,
  ): Promise<OrderEntity>;
  assignTableWaiter(businessId: string, tableId: string, waiterId: string | null): Promise<void>;
  createChangeRequest(
    businessId: string,
    orderId: string,
    requestedById: string,
    input: CreateOrderChangeRequestInput,
  ): Promise<OrderChangeRequestEntity>;
  reviewChangeRequest(
    businessId: string,
    orderId: string,
    requestId: string,
    reviewedById: string,
    input: ReviewOrderChangeRequestInput,
  ): Promise<OrderChangeRequestEntity>;
  listChangeRequests(businessId: string, orderId: string): Promise<OrderChangeRequestEntity[]>;
}

export interface OrderPricingPort {
  calculate(
    businessId: string,
    input: CreateOrderInput,
  ): Promise<import('../entities/order.entity').OrderPricingResult>;
  calculateAdditionalItems(
    businessId: string,
    input: AddOrderItemsInput,
  ): Promise<import('../entities/order.entity').OrderPricingResult>;
  recalculateExistingOrder(
    businessId: string,
    orderId: string,
    input: UpdateOrderPricingInput,
  ): Promise<import('../entities/order.entity').OrderPricingResult>;
}
