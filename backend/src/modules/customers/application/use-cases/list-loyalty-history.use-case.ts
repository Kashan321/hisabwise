import { CustomerRepository } from '../../domain/repositories/customer.repository';

export class ListLoyaltyHistoryUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  execute(businessId: string, customerId: string) {
    return this.customerRepository.listLoyaltyHistory(businessId, customerId);
  }
}
