export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'QR';
export type OrderSource = 'QR_CUSTOMER' | 'STAFF_ASSISTED' | 'ONLINE_DELIVERY';
export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type DeliveryStatus = 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'WALLET' | 'ONLINE' | 'OTHER';
export type OrderPaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'FAILED';
export type OrderStatusGroup = 'all' | 'active' | 'completed' | 'cancelled';
export type OrderChangeRequestType = 'CANCEL_ORDER' | 'REMOVE_ITEM' | 'MODIFY_ITEM';
export type OrderChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ListOrdersFilters {
  status?: OrderStatus;
  statusGroup?: OrderStatusGroup;
  source?: OrderSource;
  orderType?: OrderType;
  tableId?: string;
  tableIdentifier?: string;
  waiterId?: string;
  riderId?: string;
  deliveryStatus?: DeliveryStatus;
  isDraft?: boolean;
  includeDrafts?: boolean;
  excludeDrafts?: boolean;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  businessDayId?: string;
  cashShiftId?: string;
  businessDayIds?: string[];
  search?: string;
  minTotal?: number;
  maxTotal?: number;
  limit?: number;
}

export interface ListOrdersResult {
  orders: OrderEntity[];
  total: number;
}

export interface OrderFilterOption {
  value: string;
  label: string;
}

export interface OrderFiltersMeta {
  sources: OrderFilterOption[];
  orderTypes: OrderFilterOption[];
  tables: Array<{ id: string; tableIdentifier: string }>;
  statusGroups: OrderFilterOption[];
  paymentMethods: OrderFilterOption[];
  deliveryStatuses: OrderFilterOption[];
}

export interface OrderItemModifierEntity {
  id: string;
  modifierOptionId: string | null;
  modifierName: string;
  priceAdjustment: string;
}

export interface OrderItemEntity {
  id: string;
  menuItemId: string | null;
  menuItemName: string;
  variantId: string | null;
  variantName: string | null;
  variantPrice: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  weightG: number | null;
  unitPricePerKg: string | null;
  customizationNotes: string | null;
  isKitchenAddition: boolean;
  modifiers: OrderItemModifierEntity[];
}

export interface OrderPaymentEntity {
  id: string;
  method: PaymentMethod;
  amount: string;
  amountReceived: string | null;
  changeGiven: string | null;
  referenceNumber: string | null;
  createdAt: Date;
}

export interface OrderChangeRequestEntity {
  id: string;
  orderId: string;
  type: OrderChangeRequestType;
  status: OrderChangeRequestStatus;
  payload: Record<string, unknown> | null;
  reason: string | null;
  reviewNote: string | null;
  requestedById: string;
  requestedByName: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderEntity {
  id: string;
  businessId: string;
  tableId: string | null;
  tableIdentifier: string | null;
  customerId: string | null;
  promotionId: string | null;
  promotionTitle: string | null;
  createdById: string | null;
  createdByName: string | null;
  waiterId: string | null;
  waiterName: string | null;
  riderId: string | null;
  riderName: string | null;
  source: OrderSource;
  orderType: OrderType;
  status: OrderStatus;
  deliveryStatus: DeliveryStatus | null;
  isDraft: boolean;
  sentToKitchenAt: Date | null;
  paymentMethod: PaymentMethod | null;
  paymentStatus: OrderPaymentStatus | null;
  payments?: OrderPaymentEntity[];
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  serviceAmount: string;
  deliveryAmount: string;
  totalAmount: string;
  notes: string | null;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  ticketNumber: number | null;
  ticketPrefix: string | null;
  ticketLabel: string | null;
  businessDayId: string | null;
  cashShiftId: string | null;
  preparedById: string | null;
  preparedByName: string | null;
  preparedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemEntity[];
  changeRequests?: OrderChangeRequestEntity[];
}

export interface OrderPaymentLineInput {
  method: PaymentMethod;
  amount: number;
  amountReceived?: number;
  changeGiven?: number;
  referenceNumber?: string;
}

export interface CompleteOrderInput {
  paymentMethod?: PaymentMethod;
  paymentStatus?: OrderPaymentStatus;
  payments?: OrderPaymentLineInput[];
  cashShiftId?: string;
  completedById?: string;
}

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  variantId?: string;
  weightG?: number;
  modifierOptionIds?: string[];
  customizationNotes?: string;
}

export interface CreateOrderInput {
  source: OrderSource;
  orderType?: OrderType;
  tableId?: string;
  customerId?: string;
  promotionId?: string;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  createdById?: string;
  waiterId?: string;
  isDraft?: boolean;
  notes?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  taxRate?: number;
  serviceRate?: number;
  items: CreateOrderItemInput[];
}

export interface AddOrderItemsInput {
  items: CreateOrderItemInput[];
  taxRate?: number;
  serviceRate?: number;
}

export interface UpdateOrderPricingInput {
  promotionId?: string | null;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  taxRate?: number;
  serviceRate?: number;
  notes?: string;
}

export interface PricedOrderItem {
  menuItemId: string;
  menuItemName: string;
  variantId: string | null;
  variantName: string | null;
  variantPrice: number | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  weightG: number | null;
  unitPricePerKg: number | null;
  customizationNotes: string | null;
  modifiers: Array<{
    modifierOptionId: string;
    modifierName: string;
    priceAdjustment: number;
  }>;
}

export interface OrderPricingResult {
  subtotal: number;
  discountAmount: number;
  promotionId?: string;
  promotionTitle?: string;
  taxAmount: number;
  serviceAmount: number;
  deliveryAmount: number;
  totalAmount: number;
  items: PricedOrderItem[];
}

export interface CreateOrderChangeRequestInput {
  type: OrderChangeRequestType;
  reason?: string;
  payload?: Record<string, unknown>;
}

export interface ReviewOrderChangeRequestInput {
  status: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
}
