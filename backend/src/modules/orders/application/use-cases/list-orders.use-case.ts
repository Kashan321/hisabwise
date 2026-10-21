import { ListOrdersFilters, ListOrdersResult } from '../../domain/entities/order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { enrichOrderListFilters } from '../../infrastructure/persistence/order-list-filter';

export class ListOrdersUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(businessId: string, filters?: ListOrdersFilters): Promise<ListOrdersResult> {
    const enriched = await enrichOrderListFilters(businessId, filters);
    return this.orderRepository.findAll(businessId, enriched);
  }
}
