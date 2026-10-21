import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { CreateOrderInput } from '../../domain/entities/order.entity';
import { OrderRepository, OrderPricingPort } from '../../domain/repositories/order.repository';

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly pricingService: OrderPricingPort,
  ) {}

  async execute(businessId: string, input: CreateOrderInput) {
    const pricing = await this.pricingService.calculate(businessId, input);
    const order = await this.orderRepository.create(businessId, input, pricing);

    if (!order.isDraft) {
      emitDomainEvent('order.placed', { orderId: order.id, businessId });
    }

    return order;
  }
}
