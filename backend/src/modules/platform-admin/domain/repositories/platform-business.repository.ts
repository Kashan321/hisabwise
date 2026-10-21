import { SubscriptionStatus } from '@prisma/client';

export interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  subscriptionStatus: SubscriptionStatus;
  isSuspended: boolean;
  isSubscriptionBlocked: boolean;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  billingInterval: string | null;
  createdAt: Date;
  userCount: number;
  orderCount: number;
  ownerEmail: string | null;
  ownerName: string | null;
}

export interface BusinessDetail extends BusinessSummary {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
}

export interface PlatformBusinessRepository {
  list(): Promise<BusinessSummary[]>;
  findById(id: string): Promise<BusinessDetail | null>;
  updateSubscription(id: string, status: SubscriptionStatus): Promise<BusinessDetail>;
  setSuspended(id: string, isSuspended: boolean): Promise<BusinessDetail>;
  setSubscriptionBlocked(id: string, isSubscriptionBlocked: boolean): Promise<BusinessDetail>;
  delete(id: string): Promise<void>;
}

export interface PlatformMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  trialBusinesses: number;
  totalPlatformUsers: number;
  totalOrders: number;
  totalCustomers: number;
}

export interface PlatformMetricsRepository {
  getMetrics(): Promise<PlatformMetrics>;
}
