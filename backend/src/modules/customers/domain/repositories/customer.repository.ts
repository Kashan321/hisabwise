import {
  CreateCustomerInput,
  CustomerEntity,
  LoyaltyPointsInput,
  LoyaltyTransactionEntity,
  UpdateCustomerInput,
} from '../entities/customer.entity';

export interface CustomerRepository {
  findAll(businessId: string, search?: string): Promise<CustomerEntity[]>;
  findById(businessId: string, customerId: string): Promise<CustomerEntity | null>;
  create(businessId: string, input: CreateCustomerInput): Promise<CustomerEntity>;
  update(
    businessId: string,
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<CustomerEntity>;
  earnPoints(
    businessId: string,
    customerId: string,
    input: LoyaltyPointsInput,
  ): Promise<CustomerEntity>;
  redeemPoints(
    businessId: string,
    customerId: string,
    input: LoyaltyPointsInput,
  ): Promise<CustomerEntity>;
  listLoyaltyHistory(
    businessId: string,
    customerId: string,
  ): Promise<LoyaltyTransactionEntity[]>;
}
