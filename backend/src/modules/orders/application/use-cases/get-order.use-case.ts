import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderNotFoundError } from '../../domain/errors/order.errors';

export class GetOrderUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(businessId: string, orderId: string) {
    const order = await this.orderRepository.findById(businessId, orderId);
    if (!order) throw new OrderNotFoundError();
    return order;
  }
}
