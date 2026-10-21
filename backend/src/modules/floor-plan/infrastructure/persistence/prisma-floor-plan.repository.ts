import { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import {
  CreateFloorElementInput,
  CreateFloorPlanInput,
  FloorElementEntity,
  FloorElementType,
  FloorPlanEntity,
  UpdateFloorElementInput,
  UpdateFloorPlanInput,
} from '../../domain/entities/floor-plan.entity';
import { FloorTableEntity, TableShape, TableStatus } from '../../domain/entities/floor-table.entity';
import {
  FloorElementNotFoundError,
  FloorPlanNotFoundError,
} from '../../domain/errors/floor-plan.errors';
import { FloorPlanRepository, FloorPlanScene } from '../../domain/repositories/floor-plan.repository';

function mapPlan(plan: {
  id: string;
  businessId: string;
  name: string;
  level: number;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: Date;
  _count?: { tables: number };
}): FloorPlanEntity {
  return {
    id: plan.id,
    businessId: plan.businessId,
    name: plan.name,
    level: plan.level,
    width: plan.width,
    height: plan.height,
    sortOrder: plan.sortOrder,
    createdAt: plan.createdAt,
    tableCount: plan._count?.tables,
  };
}

function mapElement(element: {
  id: string;
  floorPlanId: string;
  type: string;
  layoutX: number;
  layoutY: number;
  width: number;
  height: number;
  rotation: number;
  options: Prisma.JsonValue;
  createdAt: Date;
}): FloorElementEntity {
  return {
    id: element.id,
    floorPlanId: element.floorPlanId,
    type: element.type as FloorElementType,
    layoutX: element.layoutX,
    layoutY: element.layoutY,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    options: (element.options as Record<string, unknown> | null) ?? null,
    createdAt: element.createdAt,
  };
}

function mapTable(table: {
  id: string;
  businessId: string;
  floorPlanId: string;
  tableIdentifier: string;
  layoutX: number;
  layoutY: number;
  width: number;
  height: number;
  capacity: number;
  shape: string;
  rotation: number;
  status: string;
  createdAt: Date;
}): FloorTableEntity {
  return {
    id: table.id,
    businessId: table.businessId,
    floorPlanId: table.floorPlanId,
    tableIdentifier: table.tableIdentifier,
    layoutX: table.layoutX,
    layoutY: table.layoutY,
    width: table.width,
    height: table.height,
    capacity: table.capacity,
    shape: table.shape as TableShape,
    rotation: table.rotation,
    status: table.status as TableStatus,
    createdAt: table.createdAt,
  };
}

export class PrismaFloorPlanRepository implements FloorPlanRepository {
  async findAllPlans(businessId: string): Promise<FloorPlanEntity[]> {
    const plans = await prisma.floorPlan.findMany({
      where: { businessId },
      orderBy: [{ sortOrder: 'asc' }, { level: 'asc' }],
      include: { _count: { select: { tables: true } } },
    });
    return plans.map(mapPlan);
  }

  async findPlanById(businessId: string, planId: string): Promise<FloorPlanEntity | null> {
    const plan = await prisma.floorPlan.findFirst({
      where: { id: planId, businessId },
      include: { _count: { select: { tables: true } } },
    });
    return plan ? mapPlan(plan) : null;
  }

  async ensureDefaultPlan(businessId: string): Promise<FloorPlanEntity> {
    const existing = await prisma.floorPlan.findFirst({
      where: { businessId },
      orderBy: [{ sortOrder: 'asc' }, { level: 'asc' }],
      include: { _count: { select: { tables: true } } },
    });
    if (existing) return mapPlan(existing);

    const plan = await prisma.floorPlan.create({
      data: {
        businessId,
        name: 'Ground Floor',
        level: 1,
        width: 800,
        height: 600,
        sortOrder: 0,
      },
      include: { _count: { select: { tables: true } } },
    });
    return mapPlan(plan);
  }

  async createPlan(businessId: string, input: CreateFloorPlanInput): Promise<FloorPlanEntity> {
    const maxSort = await prisma.floorPlan.aggregate({
      where: { businessId },
      _max: { sortOrder: true },
    });
    const plan = await prisma.floorPlan.create({
      data: {
        businessId,
        name: input.name,
        level: input.level ?? 1,
        width: input.width,
        height: input.height,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: { _count: { select: { tables: true } } },
    });
    return mapPlan(plan);
  }

  async updatePlan(
    businessId: string,
    planId: string,
    input: UpdateFloorPlanInput,
  ): Promise<FloorPlanEntity> {
    const existing = await prisma.floorPlan.findFirst({ where: { id: planId, businessId } });
    if (!existing) throw new FloorPlanNotFoundError();

    const plan = await prisma.floorPlan.update({
      where: { id: planId },
      data: input,
      include: { _count: { select: { tables: true } } },
    });
    return mapPlan(plan);
  }

  async deletePlan(businessId: string, planId: string): Promise<void> {
    const existing = await prisma.floorPlan.findFirst({ where: { id: planId, businessId } });
    if (!existing) throw new FloorPlanNotFoundError();

    const count = await prisma.floorPlan.count({ where: { businessId } });
    if (count <= 1) {
      throw new FloorPlanNotFoundError();
    }

    await prisma.floorPlan.delete({ where: { id: planId } });
  }

  async getScene(businessId: string, planId: string): Promise<FloorPlanScene | null> {
    const plan = await prisma.floorPlan.findFirst({
      where: { id: planId, businessId },
      include: {
        tables: { orderBy: { tableIdentifier: 'asc' } },
        elements: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!plan) return null;

    return {
      plan: mapPlan(plan),
      tables: plan.tables.map(mapTable),
      elements: plan.elements.map(mapElement),
    };
  }

  async createElement(
    businessId: string,
    planId: string,
    input: CreateFloorElementInput,
  ): Promise<FloorElementEntity> {
    const plan = await prisma.floorPlan.findFirst({ where: { id: planId, businessId } });
    if (!plan) throw new FloorPlanNotFoundError();

    const element = await prisma.floorElement.create({
      data: {
        floorPlanId: planId,
        type: input.type,
        layoutX: input.layoutX,
        layoutY: input.layoutY,
        width: input.width,
        height: input.height,
        rotation: input.rotation ?? 0,
        options: input.options ?? undefined,
      },
    });
    return mapElement(element);
  }

  async updateElement(
    businessId: string,
    elementId: string,
    input: UpdateFloorElementInput,
  ): Promise<FloorElementEntity> {
    const existing = await prisma.floorElement.findFirst({
      where: { id: elementId, floorPlan: { businessId } },
    });
    if (!existing) throw new FloorElementNotFoundError();

    const element = await prisma.floorElement.update({
      where: { id: elementId },
      data: {
        ...input,
        options: input.options ?? undefined,
      },
    });
    return mapElement(element);
  }

  async deleteElement(businessId: string, elementId: string): Promise<void> {
    const result = await prisma.floorElement.deleteMany({
      where: { id: elementId, floorPlan: { businessId } },
    });
    if (result.count === 0) throw new FloorElementNotFoundError();
  }
}
