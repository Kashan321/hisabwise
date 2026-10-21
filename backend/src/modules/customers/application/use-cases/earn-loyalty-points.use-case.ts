import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { LoyaltyPointsInput } from '../../domain/entities/customer.entity';
import { CustomerRepository } from '../../domain/repositories/customer.repository';

export class EarnLoyaltyPointsUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(businessId: string, customerId: string, input: LoyaltyPointsInput) {
    const customer = await this.customerRepository.earnPoints(businessId, customerId, input);
    emitDomainEvent('loyalty.points_earned', {
      customerId,
      businessId,
      points: input.points,
    });
    return customer;
  }
}
