export interface CustomerEntity {
  id: string;
  businessId: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  deliveryAddress: string | null;
  loyaltyPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyTransactionEntity {
  id: string;
  businessId: string;
  customerId: string;
  type: 'EARN' | 'REDEEM' | 'ADJUST';
  points: number;
  reason: string | null;
  orderId: string | null;
  createdAt: Date;
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phoneNumber?: string;
  deliveryAddress?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string | null;
  phoneNumber?: string | null;
  deliveryAddress?: string | null;
}

export interface LoyaltyPointsInput {
  points: number;
  reason?: string;
  orderId?: string;
}
