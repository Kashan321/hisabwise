import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { CreateOrderInput, CreateOrderResult } from '../../domain/entities/order.entity';
import { OrderRepository, OrderPricingPort } from '../../domain/repositories/order.repository';

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly pricingService: OrderPricingPort,
  ) {}

  async execute(businessId: string, input: CreateOrderInput): Promise<CreateOrderResult> {
    const key = input.idempotencyKey?.trim();
    if (key) {
      const existing = await this.orderRepository.findByIdempotencyKey(businessId, key);
      if (existing) {
        return { order: existing, idempotentReplay: true };
      }
    }

    const pricing = await this.pricingService.calculate(businessId, input);
    const result = await this.orderRepository.create(businessId, input, pricing);

    if (!result.idempotentReplay && !result.order.isDraft) {
      emitDomainEvent('order.placed', { orderId: result.order.id, businessId });
    }

    return result;
  }
}
