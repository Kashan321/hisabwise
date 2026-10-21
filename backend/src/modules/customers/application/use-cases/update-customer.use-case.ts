import { UpdateCustomerInput } from '../../domain/entities/customer.entity';
import { CustomerRepository } from '../../domain/repositories/customer.repository';
import { CustomerNotFoundError } from '../../domain/errors/customer.errors';

export class UpdateCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(businessId: string, customerId: string, input: UpdateCustomerInput) {
    const existing = await this.customerRepository.findById(businessId, customerId);
    if (!existing) throw new CustomerNotFoundError();
    return this.customerRepository.update(businessId, customerId, input);
  }
}
