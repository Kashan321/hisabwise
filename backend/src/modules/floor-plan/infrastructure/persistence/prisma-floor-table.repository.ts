import {
  TableShape as PrismaTableShape,
  TableStatus as PrismaTableStatus,
} from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import {
  CreateTableInput,
  FloorTableEntity,
  TableShape,
  TableStatus,
  UpdateTableInput,
} from '../../domain/entities/floor-table.entity';
import { FloorTableRepository } from '../../domain/repositories/floor-table.repository';
import { TableNotFoundError } from '../../domain/errors/floor-plan.errors';

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
  shape: PrismaTableShape;
  rotation: number;
  status: PrismaTableStatus;
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

export class PrismaFloorTableRepository implements FloorTableRepository {
  async findAll(businessId: string, floorPlanId?: string): Promise<FloorTableEntity[]> {
    const tables = await prisma.floorTable.findMany({
      where: { businessId, ...(floorPlanId ? { floorPlanId } : {}) },
      orderBy: { tableIdentifier: 'asc' },
    });
    return tables.map(mapTable);
  }

  async findById(businessId: string, tableId: string): Promise<FloorTableEntity | null> {
    const table = await prisma.floorTable.findFirst({
      where: { id: tableId, businessId },
    });
    return table ? mapTable(table) : null;
  }

  async create(
    businessId: string,
    input: CreateTableInput,
    floorPlanId: string,
  ): Promise<FloorTableEntity> {
    const table = await prisma.floorTable.create({
      data: {
        businessId,
        floorPlanId,
        tableIdentifier: input.tableIdentifier,
        layoutX: input.layoutX,
        layoutY: input.layoutY,
        width: input.width ?? 80,
        height: input.height ?? 80,
        capacity: input.capacity ?? 4,
        shape: (input.shape ?? 'ROUND') as PrismaTableShape,
        rotation: input.rotation ?? 0,
      },
    });
    return mapTable(table);
  }

  async update(
    businessId: string,
    tableId: string,
    input: UpdateTableInput,
  ): Promise<FloorTableEntity> {
    const existing = await prisma.floorTable.findFirst({ where: { id: tableId, businessId } });
    if (!existing) throw new TableNotFoundError();

    const table = await prisma.floorTable.update({
      where: { id: tableId },
      data: {
        ...input,
        ...(input.shape ? { shape: input.shape as PrismaTableShape } : {}),
      },
    });
    return mapTable(table);
  }

  async updateStatus(
    businessId: string,
    tableId: string,
    status: TableStatus,
  ): Promise<FloorTableEntity> {
    const existing = await prisma.floorTable.findFirst({ where: { id: tableId, businessId } });
    if (!existing) throw new TableNotFoundError();

    const table = await prisma.floorTable.update({
      where: { id: tableId },
      data: { status: status as PrismaTableStatus },
    });
    return mapTable(table);
  }

  async delete(businessId: string, tableId: string): Promise<void> {
    const result = await prisma.floorTable.deleteMany({ where: { id: tableId, businessId } });
    if (result.count === 0) throw new TableNotFoundError();
  }
}
