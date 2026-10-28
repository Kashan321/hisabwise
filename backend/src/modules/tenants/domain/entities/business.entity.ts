export interface BusinessEntity {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  city: string | null;
  branchNumber: string | null;
  phone: string | null;
  phoneSecondary: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  currency: string | null;
  subscriptionStatus: string;
  allowNegativeInventory: boolean;
  orderTicketPrefix: string;
  orderTicketResetDaily: boolean;
  businessDayStartTime: string;
  businessDayTimezone: string;
  businessDayAutoCloseEnabled: boolean;
  businessDayCloseReminderEnabled: boolean;
  defaultTaxRate: number;
  defaultDeliveryCharge: number;
  createdAt: Date;
}

export interface UpdateBusinessInput {
  name?: string;
  location?: string | null;
  city?: string | null;
  branchNumber?: string | null;
  phone?: string | null;
  phoneSecondary?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  currency?: string | null;
  allowNegativeInventory?: boolean;
  orderTicketPrefix?: string;
  orderTicketResetDaily?: boolean;
  businessDayStartTime?: string;
  businessDayTimezone?: string;
  businessDayAutoCloseEnabled?: boolean;
  businessDayCloseReminderEnabled?: boolean;
  defaultTaxRate?: number;
  defaultDeliveryCharge?: number;
}
