import { CreateCustomerInput } from '../../domain/entities/customer.entity';
import { CustomerRepository } from '../../domain/repositories/customer.repository';

export class CreateCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  execute(businessId: string, input: CreateCustomerInput) {
    return this.customerRepository.create(businessId, input);
  }
}
