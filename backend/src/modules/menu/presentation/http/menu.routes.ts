import { Router } from 'express';
import {
  requireAuth,
  requireAnyPermission,
  requirePermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { menuController } from './menu.controller';
import { uploadMenuCsv } from '../middlewares/upload-csv.middleware';
import {
  createCategorySchema,
  createMenuItemSchema,
  createModifierGroupSchema,
  createModifierOptionSchema,
  createMenuItemVariantSchema,
  linkModifierGroupSchema,
  updateCategorySchema,
  updateMenuItemSchema,
  updateMenuItemVariantSchema,
  updateModifierGroupSchema,
  updateModifierOptionSchema,
} from './menu.validators';
import { sellableInventorySchema } from '../../../inventory/presentation/http/inventory.validators';
import { tenantMenuGalleryController } from '../../../menu-gallery/presentation/http/menu-gallery.controller';

const canViewMenu = requireAnyPermission('menu.manage', 'orders.view', 'orders.create', 'orders.serve');
const canManageMenu = requirePermission('menu.manage');

export const menuRouter = Router();

menuRouter.get('/', requireAuth, canViewMenu, menuController.getFullMenu);

menuRouter.get(
  '/gallery-images',
  requireAuth,
  canManageMenu,
  tenantMenuGalleryController.list,
);

menuRouter.get(
  '/import/sample',
  requireAuth,
  canManageMenu,
  menuController.downloadImportSample,
);

menuRouter.post(
  '/import',
  requireAuth,
  canManageMenu,
  uploadMenuCsv,
  menuController.importCsv,
);

menuRouter.get(
  '/modifier-groups',
  requireAuth,
  canViewMenu,
  menuController.listModifierGroups,
);

menuRouter.post(
  '/categories',
  requireAuth,
  canManageMenu,
  validateBody(createCategorySchema),
  menuController.createCategory,
);

menuRouter.patch(
  '/categories/:id',
  requireAuth,
  canManageMenu,
  validateBody(updateCategorySchema),
  menuController.updateCategory,
);

menuRouter.delete('/categories/:id', requireAuth, canManageMenu, menuController.deleteCategory);

menuRouter.post(
  '/items',
  requireAuth,
  canManageMenu,
  validateBody(createMenuItemSchema),
  menuController.createItem,
);

menuRouter.patch(
  '/items/:id',
  requireAuth,
  canManageMenu,
  validateBody(updateMenuItemSchema),
  menuController.updateItem,
);

menuRouter.delete('/items/:id', requireAuth, canManageMenu, menuController.deleteItem);

menuRouter.post(
  '/items/:id/modifier-groups',
  requireAuth,
  canManageMenu,
  validateBody(linkModifierGroupSchema),
  menuController.linkModifierGroup,
);

menuRouter.delete(
  '/items/:itemId/modifier-groups/:groupId',
  requireAuth,
  canManageMenu,
  menuController.unlinkModifierGroup,
);

menuRouter.post(
  '/modifier-groups',
  requireAuth,
  canManageMenu,
  validateBody(createModifierGroupSchema),
  menuController.createModifierGroup,
);

menuRouter.patch(
  '/modifier-groups/:id',
  requireAuth,
  canManageMenu,
  validateBody(updateModifierGroupSchema),
  menuController.updateModifierGroup,
);

menuRouter.delete(
  '/modifier-groups/:id',
  requireAuth,
  canManageMenu,
  menuController.deleteModifierGroup,
);

menuRouter.post(
  '/modifier-groups/:id/options',
  requireAuth,
  canManageMenu,
  validateBody(createModifierOptionSchema),
  menuController.createModifierOption,
);

menuRouter.patch(
  '/modifier-options/:id',
  requireAuth,
  canManageMenu,
  validateBody(updateModifierOptionSchema),
  menuController.updateModifierOption,
);

menuRouter.delete(
  '/modifier-options/:id',
  requireAuth,
  canManageMenu,
  menuController.deleteModifierOption,
);

menuRouter.post(
  '/items/:id/variants',
  requireAuth,
  canManageMenu,
  validateBody(createMenuItemVariantSchema),
  menuController.createVariant,
);

menuRouter.patch(
  '/variants/:id',
  requireAuth,
  canManageMenu,
  validateBody(updateMenuItemVariantSchema),
  menuController.updateVariant,
);

menuRouter.delete('/variants/:id', requireAuth, canManageMenu, menuController.deleteVariant);

menuRouter.get(
  '/items/:id/inventory',
  requireAuth,
  canManageMenu,
  menuController.getItemInventory,
);
menuRouter.put(
  '/items/:id/inventory',
  requireAuth,
  canManageMenu,
  validateBody(sellableInventorySchema),
  menuController.updateItemInventory,
);
menuRouter.get(
  '/variants/:id/inventory',
  requireAuth,
  canManageMenu,
  menuController.getVariantInventory,
);
menuRouter.put(
  '/variants/:id/inventory',
  requireAuth,
  canManageMenu,
  validateBody(sellableInventorySchema),
  menuController.updateVariantInventory,
);
menuRouter.get(
  '/modifier-options/:id/inventory',
  requireAuth,
  canManageMenu,
  menuController.getModifierOptionInventory,
);
menuRouter.put(
  '/modifier-options/:id/inventory',
  requireAuth,
  canManageMenu,
  validateBody(sellableInventorySchema),
  menuController.updateModifierOptionInventory,
);
