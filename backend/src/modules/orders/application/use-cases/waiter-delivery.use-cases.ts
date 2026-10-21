import { prisma } from '../../../../shared/database/prisma-client';
import { ROLES } from '../../../../config/constants';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderStatus } from '../../domain/entities/order.entity';

export class GetWaiterDashboardUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(businessId: string, waiterId: string) {
    const [myOrdersResult, allActiveOrders] = await Promise.all([
      this.orderRepository.findAll(businessId, {
        waiterId,
        includeDrafts: true,
        statusGroup: 'active',
      }),
      this.orderRepository.findAll(businessId, {
        statusGroup: 'active',
        includeDrafts: true,
      }),
    ]);

    const myOrders = myOrdersResult.orders;
    const myTableIds = [
      ...new Set(
        myOrders
          .filter((order) => order.tableId)
          .map((order) => order.tableId as string),
      ),
    ];

    const assignedTables = myTableIds.length
      ? await prisma.floorTable.findMany({
          where: { businessId, id: { in: myTableIds } },
          select: {
            id: true,
            tableIdentifier: true,
            status: true,
            capacity: true,
          },
          orderBy: { tableIdentifier: 'asc' },
        })
      : [];
    const waitingForKitchen = myOrders.filter((order) => order.isDraft);
    const preparing = myOrders.filter((order) => !order.isDraft && order.status === 'PREPARING');
    const readyOrders = myOrders.filter((order) => !order.isDraft && order.status === 'READY');

    const tablesRequiringAttention = assignedTables.filter((table) => {
      if (table.status === 'NEEDS_CLEANING') return true;
      const hasActiveOrder = allActiveOrders.orders.some(
        (order) => order.tableId === table.id && !order.isDraft,
      );
      return table.status === 'OCCUPIED' && !hasActiveOrder;
    });

    const assignedTablesWithOrders = assignedTables.map((table) => ({
      ...table,
      activeOrder: myOrders.find((order) => order.tableId === table.id) ?? null,
    }));

    return {
      assignedTables: assignedTablesWithOrders,
      myOrders,
      stats: {
        activeOrders: myOrders.length,
        waitingForKitchen: waitingForKitchen.length,
        preparing: preparing.length,
        ready: readyOrders.length,
        tablesRequiringAttention: tablesRequiringAttention.length,
      },
      waitingForKitchen,
      preparing,
      readyOrders,
      tablesRequiringAttention,
    };
  }
}

export class ListWaiterOrdersUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  execute(businessId: string, waiterId: string) {
    return this.orderRepository.findAll(businessId, {
      waiterId,
      includeDrafts: true,
      statusGroup: 'active',
    });
  }
}

export class GetRiderDashboardUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(businessId: string, riderId: string) {
    const { orders } = await this.orderRepository.findAll(businessId, {
      riderId,
      orderType: 'DELIVERY',
      includeDrafts: true,
      statusGroup: 'active',
    });

    const assigned = orders.filter((order) => order.deliveryStatus === 'ASSIGNED');
    const pickedUp = orders.filter((order) => order.deliveryStatus === 'PICKED_UP');
    const outForDelivery = orders.filter(
      (order) => order.deliveryStatus === 'OUT_FOR_DELIVERY',
    );

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const deliveredToday = await prisma.order.count({
      where: {
        businessId,
        riderId,
        orderType: 'DELIVERY',
        deliveryStatus: 'DELIVERED',
        updatedAt: { gte: todayStart },
      },
    });

    return {
      deliveries: orders,
      stats: {
        assigned: assigned.length,
        pickedUp: pickedUp.length,
        outForDelivery: outForDelivery.length,
        deliveredToday,
      },
      assigned,
      pickedUp,
      outForDelivery,
    };
  }
}

export class ListDeliveryOrdersUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  execute(businessId: string, status?: OrderStatus) {
    return this.orderRepository.findAll(businessId, {
      orderType: 'DELIVERY',
      excludeDrafts: true,
      ...(status ? { status } : { statusGroup: 'active' }),
    });
  }
}

export class ListRiderDeliveriesUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  execute(businessId: string, riderId: string) {
    return this.orderRepository.findAll(businessId, {
      riderId,
      orderType: 'DELIVERY',
      includeDrafts: true,
      statusGroup: 'active',
    });
  }
}

export class ListRidersUseCase {
  async execute(businessId: string) {
    const riders = await prisma.user.findMany({
      where: {
        businessId,
        isActive: true,
        userRoles: {
          some: {
            businessId,
            role: { name: ROLES.RIDER, isSystem: true },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return riders;
  }
}

export function isWaiterRole(roles: string[]): boolean {
  return roles.includes(ROLES.WAITER);
}

export function isRiderRole(roles: string[]): boolean {
  return roles.includes(ROLES.RIDER);
}
