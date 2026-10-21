import { CustomerRepository } from '../../domain/repositories/customer.repository';

export class ListCustomersUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  execute(businessId: string, search?: string) {
    return this.customerRepository.findAll(businessId, search);
  }
}
