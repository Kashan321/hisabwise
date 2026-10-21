import { Request, Response } from 'express';
import { menuModule } from '../../infrastructure/menu.module';
import { inventoryModule } from '../../../inventory/infrastructure/inventory.module';
import { MENU_CSV_SAMPLE } from '../../application/menu-csv';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class MenuController {
  getFullMenu = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.tenantContext!.businessId;
    const menu = await menuModule.getFullMenu.execute(businessId);
    const inventoryAvailability = await inventoryModule.getAvailability.execute(businessId);
    return success(res, { menu, inventoryAvailability });
  });

  createCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await menuModule.createCategory.execute(
      req.tenantContext!.businessId,
      req.body,
    );
    return success(res, { category }, 201);
  });

  updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await menuModule.updateCategory.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { category });
  });

  deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    await menuModule.deleteCategory.execute(req.tenantContext!.businessId, String(req.params.id));
    return success(res, { message: 'Category deleted' });
  });

  createItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await menuModule.createItem.execute(req.tenantContext!.businessId, req.body);
    return success(res, { item }, 201);
  });

  updateItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await menuModule.updateItem.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { item });
  });

  deleteItem = asyncHandler(async (req: Request, res: Response) => {
    await menuModule.deleteItem.execute(req.tenantContext!.businessId, String(req.params.id));
    return success(res, { message: 'Item deleted' });
  });

  createModifierGroup = asyncHandler(async (req: Request, res: Response) => {
    const group = await menuModule.createModifierGroup.execute(
      req.tenantContext!.businessId,
      req.body,
    );
    return success(res, { modifierGroup: group }, 201);
  });

  updateModifierGroup = asyncHandler(async (req: Request, res: Response) => {
    const group = await menuModule.updateModifierGroup.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { modifierGroup: group });
  });

  deleteModifierGroup = asyncHandler(async (req: Request, res: Response) => {
    await menuModule.deleteModifierGroup.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { message: 'Modifier group deleted' });
  });

  createModifierOption = asyncHandler(async (req: Request, res: Response) => {
    const option = await menuModule.createModifierOption.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { modifierOption: option }, 201);
  });

  updateModifierOption = asyncHandler(async (req: Request, res: Response) => {
    const option = await menuModule.updateModifierOption.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { modifierOption: option });
  });

  deleteModifierOption = asyncHandler(async (req: Request, res: Response) => {
    await menuModule.deleteModifierOption.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { message: 'Modifier option deleted' });
  });

  linkModifierGroup = asyncHandler(async (req: Request, res: Response) => {
    await menuModule.linkModifierGroup.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.modifierGroupId,
    );
    return success(res, { message: 'Modifier group linked to item' }, 201);
  });

  unlinkModifierGroup = asyncHandler(async (req: Request, res: Response) => {
    await menuModule.unlinkModifierGroup.execute(
      req.tenantContext!.businessId,
      String(req.params.itemId),
      String(req.params.groupId),
    );
    return success(res, { message: 'Modifier group unlinked from item' });
  });

  listModifierGroups = asyncHandler(async (req: Request, res: Response) => {
    const modifierGroups = await menuModule.listModifierGroups.execute(
      req.tenantContext!.businessId,
    );
    return success(res, { modifierGroups });
  });

  createVariant = asyncHandler(async (req: Request, res: Response) => {
    const variant = await menuModule.createVariant.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { variant }, 201);
  });

  updateVariant = asyncHandler(async (req: Request, res: Response) => {
    const variant = await menuModule.updateVariant.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { variant });
  });

  deleteVariant = asyncHandler(async (req: Request, res: Response) => {
    await menuModule.deleteVariant.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { message: 'Variant deleted' });
  });

  downloadImportSample = asyncHandler(async (_req: Request, res: Response) => {
    return success(res, {
      csv: MENU_CSV_SAMPLE,
      filename: 'venta-menu-sample.csv',
    });
  });

  importCsv = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file?.buffer) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'CSV file is required', 400);
    }

    const result = await menuModule.importMenuCsv.execute(
      req.tenantContext!.businessId,
      req.file.buffer.toString('utf-8'),
    );

    return success(res, { import: result }, 201);
  });

  updateItemInventory = asyncHandler(async (req: Request, res: Response) => {
    const config = await inventoryModule.updateSellableInventory.updateMenuItem(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { inventory: config });
  });

  updateVariantInventory = asyncHandler(async (req: Request, res: Response) => {
    const config = await inventoryModule.updateSellableInventory.updateVariant(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { inventory: config });
  });

  updateModifierOptionInventory = asyncHandler(async (req: Request, res: Response) => {
    const config = await inventoryModule.updateSellableInventory.updateModifierOption(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { inventory: config });
  });

  getItemInventory = asyncHandler(async (req: Request, res: Response) => {
    const inventory = await inventoryModule.updateSellableInventory.getMenuItemInventoryConfig(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { inventory });
  });

  getVariantInventory = asyncHandler(async (req: Request, res: Response) => {
    const inventory = await inventoryModule.updateSellableInventory.getVariantInventoryConfig(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { inventory });
  });

  getModifierOptionInventory = asyncHandler(async (req: Request, res: Response) => {
    const inventory = await inventoryModule.updateSellableInventory.getModifierInventoryConfig(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { inventory });
  });
}

export const menuController = new MenuController();
