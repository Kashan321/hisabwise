import type { InventoryMovementType, InventoryUnit } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import {
  InventoryItemNameConflictError,
  InventoryItemNotFoundError,
} from '../../domain/errors/inventory.errors';

export type InventoryItemEntity = {
  id: string;
  name: string;
  unit: InventoryUnit;
  currentQuantity: string;
  minThreshold: string | null;
  isActive: boolean;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  createdAt: string;
  updatedAt: string;
};

export type InventoryMovementEntity = {
  id: string;
  inventoryItemId: string;
  type: InventoryMovementType;
  quantityDelta: string;
  quantityAfter: string;
  orderId: string | null;
  orderItemId: string | null;
  note: string | null;
  createdById: string | null;
  createdAt: string;
};

function computeStockStatus(
  current: number,
  minThreshold: number | null,
): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (current <= 0) return 'out_of_stock';
  if (minThreshold !== null && current <= minThreshold) return 'low_stock';
  return 'in_stock';
}

function mapItem(row: {
  id: string;
  name: string;
  unit: InventoryUnit;
  currentQuantity: Prisma.Decimal;
  minThreshold: Prisma.Decimal | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): InventoryItemEntity {
  const current = Number(row.currentQuantity);
  const threshold = row.minThreshold ? Number(row.minThreshold) : null;
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    currentQuantity: row.currentQuantity.toString(),
    minThreshold: row.minThreshold?.toString() ?? null,
    isActive: row.isActive,
    stockStatus: computeStockStatus(current, threshold),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaInventoryRepository {
  async listItems(businessId: string): Promise<InventoryItemEntity[]> {
    const rows = await prisma.inventoryItem.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapItem);
  }

  async findItem(businessId: string, id: string): Promise<InventoryItemEntity | null> {
    const row = await prisma.inventoryItem.findFirst({ where: { id, businessId } });
    return row ? mapItem(row) : null;
  }

  async createItem(
    businessId: string,
    input: {
      name: string;
      unit: InventoryUnit;
      currentQuantity?: number;
      minThreshold?: number | null;
    },
  ): Promise<InventoryItemEntity> {
    try {
      const row = await prisma.inventoryItem.create({
        data: {
          businessId,
          name: input.name,
          unit: input.unit,
          currentQuantity: input.currentQuantity ?? 0,
          minThreshold: input.minThreshold ?? null,
        },
      });
      return mapItem(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new InventoryItemNameConflictError();
      }
      throw error;
    }
  }

  async updateItem(
    businessId: string,
    id: string,
    input: {
      name?: string;
      unit?: InventoryUnit;
      minThreshold?: number | null;
      isActive?: boolean;
    },
  ): Promise<InventoryItemEntity> {
    const existing = await prisma.inventoryItem.findFirst({ where: { id, businessId } });
    if (!existing) throw new InventoryItemNotFoundError();

    try {
      const row = await prisma.inventoryItem.update({
        where: { id },
        data: {
          name: input.name,
          unit: input.unit,
          minThreshold: input.minThreshold,
          isActive: input.isActive,
        },
      });
      return mapItem(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new InventoryItemNameConflictError();
      }
      throw error;
    }
  }

  async listMovements(
    businessId: string,
    filters: {
      inventoryItemId?: string;
      type?: InventoryMovementType;
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ): Promise<InventoryMovementEntity[]> {
    const rows = await prisma.inventoryMovement.findMany({
      where: {
        businessId,
        inventoryItemId: filters.inventoryItemId,
        type: filters.type,
        createdAt: {
          gte: filters.from,
          lte: filters.to,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 100,
    });

    return rows.map((r) => ({
      id: r.id,
      inventoryItemId: r.inventoryItemId,
      type: r.type,
      quantityDelta: r.quantityDelta.toString(),
      quantityAfter: r.quantityAfter.toString(),
      orderId: r.orderId,
      orderItemId: r.orderItemId,
      note: r.note,
      createdById: r.createdById,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
