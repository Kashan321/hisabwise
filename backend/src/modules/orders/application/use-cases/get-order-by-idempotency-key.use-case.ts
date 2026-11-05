import { OrderRepository } from '../../domain/repositories/order.repository';

export class GetOrderByIdempotencyKeyUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  execute(businessId: string, idempotencyKey: string) {
    return this.orderRepository.findByIdempotencyKey(businessId, idempotencyKey.trim());
  }
}
