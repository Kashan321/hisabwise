import { Request, Response } from 'express';
import { z } from 'zod';
import { inventoryModule } from '../../infrastructure/inventory.module';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { listMovementsQuerySchema } from './inventory.validators';

type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;

export class InventoryController {
  listItems = asyncHandler(async (req: Request, res: Response) => {
    const items = await inventoryModule.listItems.execute(req.tenantContext!.businessId);
    return success(res, { items });
  });

  createItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await inventoryModule.createItem.execute(
      req.tenantContext!.businessId,
      req.body,
    );
    return success(res, { item }, 201);
  });

  getItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await inventoryModule.getItem.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { item });
  });

  updateItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await inventoryModule.updateItem.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { item });
  });

  receiveStock = asyncHandler(async (req: Request, res: Response) => {
    const row = await inventoryModule.receiveStock.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.quantity,
      req.tenantContext!.userId,
      req.body.note,
    );
    const item = await inventoryModule.getItem.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { item, movement: { quantityAfter: row.currentQuantity.toString() } });
  });

  adjustStock = asyncHandler(async (req: Request, res: Response) => {
    const row = await inventoryModule.adjustStock.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.quantityDelta,
      req.tenantContext!.userId,
      req.body.note,
      req.body.type,
    );
    const item = await inventoryModule.getItem.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { item, movement: { quantityAfter: row.currentQuantity.toString() } });
  });

  listMovements = asyncHandler(async (req: Request, res: Response) => {
    const query = req.validatedQuery as ListMovementsQuery;
    const movements = await inventoryModule.listMovements.execute(req.tenantContext!.businessId, {
      inventoryItemId: query.inventoryItemId,
      type: query.type,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit,
    });
    return success(res, { movements });
  });

  getAvailability = asyncHandler(async (req: Request, res: Response) => {
    const availability = await inventoryModule.getAvailability.execute(
      req.tenantContext!.businessId,
    );
    return success(res, { availability });
  });
}

export const inventoryController = new InventoryController();
