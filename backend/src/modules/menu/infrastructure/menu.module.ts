import { GetFullMenuUseCase } from '../application/use-cases/get-full-menu.use-case';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  UpdateCategoryUseCase,
} from '../application/use-cases/category.use-cases';
import {
  CreateMenuItemUseCase,
  DeleteMenuItemUseCase,
  UpdateMenuItemUseCase,
} from '../application/use-cases/item.use-cases';
import {
  CreateModifierGroupUseCase,
  CreateModifierOptionUseCase,
  DeleteModifierGroupUseCase,
  DeleteModifierOptionUseCase,
  LinkModifierGroupUseCase,
  UnlinkModifierGroupUseCase,
  UpdateModifierGroupUseCase,
  UpdateModifierOptionUseCase,
} from '../application/use-cases/modifier.use-cases';
import {
  CreateMenuItemVariantUseCase,
  DeleteMenuItemVariantUseCase,
  ListModifierGroupsUseCase,
  UpdateMenuItemVariantUseCase,
} from '../application/use-cases/variant.use-cases';
import { ImportMenuCsvUseCase } from '../application/use-cases/import-menu-csv.use-case';
import { PrismaMenuRepository } from './persistence/prisma-menu.repository';

const menuRepository = new PrismaMenuRepository();

export const menuModule = {
  getFullMenu: new GetFullMenuUseCase(menuRepository),
  createCategory: new CreateCategoryUseCase(menuRepository),
  updateCategory: new UpdateCategoryUseCase(menuRepository),
  deleteCategory: new DeleteCategoryUseCase(menuRepository),
  createItem: new CreateMenuItemUseCase(menuRepository),
  updateItem: new UpdateMenuItemUseCase(menuRepository),
  deleteItem: new DeleteMenuItemUseCase(menuRepository),
  createModifierGroup: new CreateModifierGroupUseCase(menuRepository),
  updateModifierGroup: new UpdateModifierGroupUseCase(menuRepository),
  deleteModifierGroup: new DeleteModifierGroupUseCase(menuRepository),
  createModifierOption: new CreateModifierOptionUseCase(menuRepository),
  updateModifierOption: new UpdateModifierOptionUseCase(menuRepository),
  deleteModifierOption: new DeleteModifierOptionUseCase(menuRepository),
  linkModifierGroup: new LinkModifierGroupUseCase(menuRepository),
  unlinkModifierGroup: new UnlinkModifierGroupUseCase(menuRepository),
  listModifierGroups: new ListModifierGroupsUseCase(menuRepository),
  createVariant: new CreateMenuItemVariantUseCase(menuRepository),
  updateVariant: new UpdateMenuItemVariantUseCase(menuRepository),
  deleteVariant: new DeleteMenuItemVariantUseCase(menuRepository),
  importMenuCsv: new ImportMenuCsvUseCase(),
};
