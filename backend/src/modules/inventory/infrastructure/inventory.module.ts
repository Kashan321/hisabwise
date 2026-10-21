import { PrismaInventoryRepository } from './persistence/prisma-inventory.repository';
import { inventoryStockService } from '../application/services/inventory-stock.service';
import { inventoryAvailabilityCalculator } from '../application/services/inventory-availability-calculator';
import { UpdateSellableInventoryUseCase } from '../application/use-cases/update-sellable-inventory.use-case';
import type { InventoryMovementType } from '@prisma/client';
import { InventoryItemNotFoundError } from '../domain/errors/inventory.errors';

const repository = new PrismaInventoryRepository();

export class ListInventoryItemsUseCase {
  execute(businessId: string) {
    return repository.listItems(businessId);
  }
}

export class GetInventoryItemUseCase {
  async execute(businessId: string, id: string) {
    const item = await repository.findItem(businessId, id);
    if (!item) throw new InventoryItemNotFoundError();
    return item;
  }
}

export class CreateInventoryItemUseCase {
  execute(
    businessId: string,
    input: {
      name: string;
      unit: import('@prisma/client').InventoryUnit;
      currentQuantity?: number;
      minThreshold?: number | null;
    },
  ) {
    return repository.createItem(businessId, input);
  }
}

export class UpdateInventoryItemUseCase {
  execute(
    businessId: string,
    id: string,
    input: {
      name?: string;
      unit?: import('@prisma/client').InventoryUnit;
      minThreshold?: number | null;
      isActive?: boolean;
    },
  ) {
    return repository.updateItem(businessId, id, input);
  }
}

export class ReceiveInventoryStockUseCase {
  execute(
    businessId: string,
    inventoryItemId: string,
    quantity: number,
    actorId: string,
    note?: string,
  ) {
    return inventoryStockService.adjustStock(
      businessId,
      inventoryItemId,
      quantity,
      'RECEIPT',
      actorId,
      note,
    );
  }
}

export class AdjustInventoryStockUseCase {
  execute(
    businessId: string,
    inventoryItemId: string,
    quantityDelta: number,
    actorId: string,
    note?: string,
    type: InventoryMovementType = 'ADJUSTMENT',
  ) {
    return inventoryStockService.adjustStock(
      businessId,
      inventoryItemId,
      quantityDelta,
      type,
      actorId,
      note,
    );
  }
}

export class ListInventoryMovementsUseCase {
  execute(
    businessId: string,
    filters: {
      inventoryItemId?: string;
      type?: InventoryMovementType;
      from?: Date;
      to?: Date;
      limit?: number;
    },
  ) {
    return repository.listMovements(businessId, filters);
  }
}

export class GetInventoryAvailabilityUseCase {
  execute(businessId: string) {
    return inventoryAvailabilityCalculator.getMenuAvailability(businessId);
  }
}

export const inventoryModule = {
  listItems: new ListInventoryItemsUseCase(),
  getItem: new GetInventoryItemUseCase(),
  createItem: new CreateInventoryItemUseCase(),
  updateItem: new UpdateInventoryItemUseCase(),
  receiveStock: new ReceiveInventoryStockUseCase(),
  adjustStock: new AdjustInventoryStockUseCase(),
  listMovements: new ListInventoryMovementsUseCase(),
  getAvailability: new GetInventoryAvailabilityUseCase(),
  updateSellableInventory: new UpdateSellableInventoryUseCase(),
};
