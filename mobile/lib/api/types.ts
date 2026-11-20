export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string; details?: unknown };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  businessId: string;
  businessSlug: string;
  roles: string[];
  permissions: string[];
}

export interface BusinessDayLifecycle {
  reminder?: {
    code: string;
    openBusinessDate: string;
    currentBusinessDate: string;
    businessDayId: string;
    hasOpenShifts: boolean;
  };
  autoClosed?: { businessDayId: string; businessDate: string };
}

export interface BusinessDay {
  id: string;
  businessId: string;
  businessDate: string;
  startedAt: string;
  endedAt: string | null;
  status: 'OPEN' | 'CLOSED';
  openedByName: string | null;
}

export interface CurrentBusinessDayState {
  businessDay: BusinessDay | null;
  lifecycle: BusinessDayLifecycle;
  currentBusinessDate?: string;
}

export interface CashShift {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openingCash: string | number;
  openedAt: string;
  openedByName: string;
  closedAt?: string | null;
}

export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

export interface MenuItemVariant {
  id: string;
  name: string;
  price: string | number;
  isAvailable: boolean;
}

export type MenuPricingType = 'FIXED' | 'BY_WEIGHT';

export interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  imageUrl?: string | null;
  isAvailable: boolean;
  displayOrder: number;
  categoryId: string;
  pricingType?: MenuPricingType;
  variants?: MenuItemVariant[];
}

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'QR';

export interface OrderPayment {
  id: string;
  method: string;
  amount: string | number;
  amountReceived?: string | number | null;
  changeGiven?: string | number | null;
}

export interface OrderItem {
  id: string;
  menuItemId?: string;
  menuItemName: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
}

export interface Order {
  id: string;
  status: string;
  source: string;
  orderType?: OrderType;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  payments?: OrderPayment[];
  subtotal: string | number;
  totalAmount: string | number;
  notes?: string | null;
  createdAt: string;
  items?: OrderItem[];
  isDraft?: boolean;
  sentToKitchenAt?: string | null;
  ticketNumber?: number | null;
  ticketLabel?: string | null;
}

export interface OrderListFilters {
  status?: string;
  statusGroup?: 'all' | 'active' | 'completed' | 'cancelled';
  isDraft?: boolean;
  includeDrafts?: boolean;
  limit?: number;
  search?: string;
}

export interface OrdersQueryResult {
  orders: Order[];
  meta?: { total: number };
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}