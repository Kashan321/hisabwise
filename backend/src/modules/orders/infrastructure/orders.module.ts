import { CreateOrderUseCase } from '../application/use-cases/create-order.use-case';
import { ListOrdersUseCase } from '../application/use-cases/list-orders.use-case';
import { GetOrderUseCase } from '../application/use-cases/get-order.use-case';
import { GetOrderFiltersUseCase } from '../application/use-cases/get-order-filters.use-case';
import { UpdateOrderStatusUseCase } from '../application/use-cases/update-order-status.use-case';
import {
  AddOrderItemsUseCase,
  UpdateOrderPricingUseCase,
  AdjustOrderItemQuantityUseCase,
  AssignRiderUseCase,
  AssignTableWaiterUseCase,
  CreateOrderChangeRequestUseCase,
  ListOrderChangeRequestsUseCase,
  ReviewOrderChangeRequestUseCase,
  SendOrderToKitchenUseCase,
  TransferOrderWaiterUseCase,
  UpdateDeliveryStatusUseCase,
} from '../application/use-cases/order-operations.use-cases';
import {
  GetRiderDashboardUseCase,
  GetWaiterDashboardUseCase,
  ListDeliveryOrdersUseCase,
  ListRiderDeliveriesUseCase,
  ListRidersUseCase,
  ListWaiterOrdersUseCase,
} from '../application/use-cases/waiter-delivery.use-cases';
import { PrismaOrderRepository } from './persistence/prisma-order.repository';
import { OrderPricingService } from './services/order-pricing.service';

const orderRepository = new PrismaOrderRepository();
const pricingService = new OrderPricingService();

export const ordersModule = {
  createOrder: new CreateOrderUseCase(orderRepository, pricingService),
  listOrders: new ListOrdersUseCase(orderRepository),
  getOrderFilters: new GetOrderFiltersUseCase(),
  getOrder: new GetOrderUseCase(orderRepository),
  updateOrderStatus: new UpdateOrderStatusUseCase(orderRepository),
  addOrderItems: new AddOrderItemsUseCase(orderRepository, pricingService),
  updateOrderPricing: new UpdateOrderPricingUseCase(orderRepository, pricingService),
  adjustOrderItemQuantity: new AdjustOrderItemQuantityUseCase(orderRepository),
  sendOrderToKitchen: new SendOrderToKitchenUseCase(orderRepository),
  assignRider: new AssignRiderUseCase(orderRepository),
  updateDeliveryStatus: new UpdateDeliveryStatusUseCase(orderRepository),
  transferOrderWaiter: new TransferOrderWaiterUseCase(orderRepository),
  assignTableWaiter: new AssignTableWaiterUseCase(orderRepository),
  createOrderChangeRequest: new CreateOrderChangeRequestUseCase(orderRepository),
  reviewOrderChangeRequest: new ReviewOrderChangeRequestUseCase(orderRepository),
  listOrderChangeRequests: new ListOrderChangeRequestsUseCase(orderRepository),
  getWaiterDashboard: new GetWaiterDashboardUseCase(orderRepository),
  listWaiterOrders: new ListWaiterOrdersUseCase(orderRepository),
  getRiderDashboard: new GetRiderDashboardUseCase(orderRepository),
  listDeliveryOrders: new ListDeliveryOrdersUseCase(orderRepository),
  listRiderDeliveries: new ListRiderDeliveriesUseCase(orderRepository),
  listRiders: new ListRidersUseCase(),
};
