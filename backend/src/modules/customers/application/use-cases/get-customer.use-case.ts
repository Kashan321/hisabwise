import { CustomerRepository } from '../../domain/repositories/customer.repository';
import { CustomerNotFoundError } from '../../domain/errors/customer.errors';

export class GetCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(businessId: string, customerId: string) {
    const customer = await this.customerRepository.findById(businessId, customerId);
    if (!customer) throw new CustomerNotFoundError();
    return customer;
  }
}
