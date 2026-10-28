import { Request, Response } from 'express';
import { z } from 'zod';
import { ROLES } from '../../../../config/constants';
import { cashShiftModule } from '../../../cash-shift/infrastructure/cash-shift.module';
import { ordersModule } from '../../infrastructure/orders.module';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { CreateOrderInput } from '../../domain/entities/order.entity';
import { listOrdersQuerySchema } from './orders.validators';

type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

function actorFromRequest(req: Request) {
  return {
    userId: req.tenantContext!.userId,
    userName: req.tenantContext!.userName,
  };
}

function applyRoleScopedFilters(req: Request, query: ListOrdersQuery): ListOrdersQuery {
  const roles = req.tenantContext!.roles ?? [];
  const permissions = req.tenantContext!.permissions ?? [];

  if (roles.includes(ROLES.WAITER) && !permissions.includes('*') && !permissions.includes('orders.manage')) {
    return {
      ...query,
      waiterId: req.tenantContext!.userId,
      includeDrafts: true,
    };
  }

  if (roles.includes(ROLES.RIDER) && !permissions.includes('*') && !permissions.includes('delivery.manage')) {
    return {
      ...query,
      riderId: req.tenantContext!.userId,
      orderType: 'DELIVERY',
      includeDrafts: true,
    };
  }

  return query;
}

export class OrdersController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const roles = req.tenantContext!.roles ?? [];
    const permissions = req.tenantContext!.permissions ?? [];
    const isWaiter =
      roles.includes(ROLES.WAITER) &&
      !permissions.includes('*') &&
      !permissions.includes('orders.manage');

    const input: CreateOrderInput = {
      ...req.body,
      createdById: req.tenantContext!.userId,
      waiterId: isWaiter ? req.tenantContext!.userId : req.body.waiterId,
      isDraft: req.body.isDraft ?? isWaiter,
    };

    const order = await ordersModule.createOrder.execute(req.tenantContext!.businessId, input);
    return success(res, { order }, 201);
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const query = applyRoleScopedFilters(req, req.validatedQuery as ListOrdersQuery);
    const result = await ordersModule.listOrders.execute(req.tenantContext!.businessId, query);
    return success(res, { orders: result.orders, meta: { total: result.total } });
  });

  filters = asyncHandler(async (req: Request, res: Response) => {
    const filters = await ordersModule.getOrderFilters.execute(req.tenantContext!.businessId);
    return success(res, { filters });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersModule.getOrder.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { order });
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersModule.updateOrderStatus.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.status,
      req.body.status === 'COMPLETED'
        ? {
            paymentMethod: req.body.paymentMethod,
            paymentStatus: req.body.paymentStatus,
            payments: req.body.payments,
          }
        : undefined,
      req.tenantContext!.userId,
    );
    return success(res, { order });
  });

  addItems = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersModule.addOrderItems.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    return success(res, { order });
  });

  updatePricing = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersModule.updateOrderPricing.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
      actorFromRequest(req),
    );
    return success(res, { order });
  });

  adjustOrderItemQuantity = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersModule.adjustOrderItemQuantity.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      String(req.params.itemId),
      req.body.delta,
      actorFromRequest(req),
    );
    return success(res, { order });
  });

  sendToKitchen = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersModule.sendOrderToKitchen.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      actorFromRequest(req),
    );
    return success(res, { order });
  });

  transferWaiter = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersModule.transferOrderWaiter.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.waiterId,
      actorFromRequest(req),
    );
    return success(res, { order });
  });

  createChangeRequest = asyncHandler(async (req: Request, res: Response) => {
    const request = await ordersModule.createOrderChangeRequest.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.tenantContext!.userId,
      req.body,
      actorFromRequest(req),
    );
    return success(res, { changeRequest: request }, 201);
  });

  reviewChangeRequest = asyncHandler(async (req: Request, res: Response) => {
    const request = await ordersModule.reviewOrderChangeRequest.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      String(req.params.requestId),
      req.tenantContext!.userId,
      req.body,
      actorFromRequest(req),
    );
    return success(res, { changeRequest: request });
  });

  listChangeRequests = asyncHandler(async (req: Request, res: Response) => {
    const changeRequests = await ordersModule.listOrderChangeRequests.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { changeRequests });
  });
}

export class WaiterController {
  dashboard = asyncHandler(async (req: Request, res: Response) => {
    const dashboard = await ordersModule.getWaiterDashboard.execute(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
    );
    return success(res, { dashboard });
  });

  listOrders = asyncHandler(async (req: Request, res: Response) => {
    const result = await ordersModule.listWaiterOrders.execute(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
    );
    return success(res, { orders: result.orders, meta: { total: result.total } });
  });

  assignTable = asyncHandler(async (req: Request, res: Response) => {
    await ordersModule.assignTableWaiter.execute(
      req.tenantContext!.businessId,
      String(req.params.tableId),
      req.body.waiterId,
      actorFromRequest(req),
    );
    return success(res, { assigned: true });
  });
}

export class DeliveryController {
  listRiders = asyncHandler(async (req: Request, res: Response) => {
    const riders = await ordersModule.listRiders.execute(req.tenantContext!.businessId);
    return success(res, { riders });
  });

  listOrders = asyncHandler(async (req: Request, res: Response) => {
    const result = await ordersModule.listDeliveryOrders.execute(
      req.tenantContext!.businessId,
      req.query.status as import('../../domain/entities/order.entity').OrderStatus | undefined,
    );
    return success(res, { orders: result.orders, meta: { total: result.total } });
  });

  assignRider = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersModule.assignRider.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.riderId,
      actorFromRequest(req),
    );
    return success(res, { order });
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersModule.updateDeliveryStatus.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.deliveryStatus,
      actorFromRequest(req),
      req.body.deliveryStatus === 'DELIVERED'
        ? {
            paymentMethod: req.body.paymentMethod,
            paymentStatus: req.body.paymentStatus,
            payments: req.body.payments,
          }
        : undefined,
    );
    return success(res, { order });
  });
}

export class RiderController {
  dashboard = asyncHandler(async (req: Request, res: Response) => {
    const dashboard = await ordersModule.getRiderDashboard.execute(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
    );
    return success(res, { dashboard });
  });

  listDeliveries = asyncHandler(async (req: Request, res: Response) => {
    const result = await ordersModule.listRiderDeliveries.execute(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
    );
    return success(res, { deliveries: result.orders, meta: { total: result.total } });
  });

  updateDeliveryStatus = asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersModule.updateDeliveryStatus.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.deliveryStatus,
      actorFromRequest(req),
      req.body.deliveryStatus === 'DELIVERED'
        ? {
            paymentMethod: req.body.paymentMethod,
            paymentStatus: req.body.paymentStatus,
            payments: req.body.payments,
          }
        : undefined,
    );
    return success(res, { order });
  });

  listPendingCash = asyncHandler(async (req: Request, res: Response) => {
    const result = await cashShiftModule.listRiderPendingCash.execute(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
    );
    return success(res, result);
  });
}

export const ordersController = new OrdersController();
export const waiterController = new WaiterController();
export const deliveryController = new DeliveryController();
export const riderController = new RiderController();
