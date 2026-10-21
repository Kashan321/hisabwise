import { LoyaltyPointsInput } from '../../domain/entities/customer.entity';
import { CustomerRepository } from '../../domain/repositories/customer.repository';

export class RedeemLoyaltyPointsUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  execute(businessId: string, customerId: string, input: LoyaltyPointsInput) {
    return this.customerRepository.redeemPoints(businessId, customerId, input);
  }
}
