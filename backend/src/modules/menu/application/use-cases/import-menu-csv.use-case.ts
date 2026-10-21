import { prisma } from '../../../../shared/database/prisma-client';
import { MenuCsvImportError } from '../../domain/errors/menu.errors';
import { MenuCsvRow, parseMenuCsv } from '../menu-csv';

export interface MenuCsvImportResult {
  categoriesCreated: number;
  itemsCreated: number;
  variantsCreated: number;
  modifierGroupsCreated: number;
  modifierOptionsCreated: number;
  linksCreated: number;
}

const IMPORT_TX_TIMEOUT_MS = 60_000;

export class ImportMenuCsvUseCase {
  async execute(businessId: string, csvContent: string): Promise<MenuCsvImportResult> {
    const { rows, errors } = parseMenuCsv(csvContent);

    if (errors.length) {
      throw new MenuCsvImportError(errors);
    }

    if (!rows.length) {
      throw new MenuCsvImportError([{ lineNumber: 1, message: 'No menu rows found in CSV' }]);
    }

    return prisma.$transaction(
      async (tx) => {
        const categoryCache = new Map<string, string>();
        const itemCache = new Map<string, string>();
        const variantCache = new Map<string, string>();
        const groupCache = new Map<string, string>();
        const optionCache = new Map<string, string>();
        const linkedGroups = new Set<string>();
        const variantOrderByItem = new Map<string, number>();
        const optionOrderByGroup = new Map<string, number>();

        let categoriesCreated = 0;
        let itemsCreated = 0;
        let variantsCreated = 0;
        let modifierGroupsCreated = 0;
        let modifierOptionsCreated = 0;
        let linksCreated = 0;

        const [existingCategories, existingGroups, existingOptions, existingVariants] =
          await Promise.all([
            tx.menuCategory.findMany({
              where: { businessId },
              select: { id: true, name: true },
            }),
            tx.modifierGroup.findMany({
              where: { businessId },
              select: { id: true, name: true },
            }),
            tx.modifierOption.findMany({
              where: { modifierGroup: { businessId } },
              select: { id: true, name: true, modifierGroupId: true, displayOrder: true },
            }),
            tx.menuItemVariant.findMany({
              where: { menuItem: { businessId } },
              select: { id: true, menuItemId: true, name: true, displayOrder: true },
            }),
          ]);

        for (const category of existingCategories) {
          categoryCache.set(category.name.toLowerCase(), category.id);
        }

        for (const group of existingGroups) {
          groupCache.set(group.name.toLowerCase(), group.id);
        }

        for (const option of existingOptions) {
          optionCache.set(
            `${option.modifierGroupId}|${option.name.toLowerCase()}`,
            option.id,
          );
          const nextOrder = option.displayOrder + 1;
          const current = optionOrderByGroup.get(option.modifierGroupId) ?? 0;
          optionOrderByGroup.set(option.modifierGroupId, Math.max(current, nextOrder));
        }

        for (const variant of existingVariants) {
          variantCache.set(
            `${variant.menuItemId}|${variant.name.toLowerCase()}`,
            variant.id,
          );
          const nextOrder = variant.displayOrder + 1;
          const current = variantOrderByItem.get(variant.menuItemId) ?? 0;
          variantOrderByItem.set(variant.menuItemId, Math.max(current, nextOrder));
        }

        async function ensureCategory(name: string) {
          const key = name.toLowerCase();
          const cached = categoryCache.get(key);
          if (cached) return cached;

          const created = await tx.menuCategory.create({
            data: { businessId, name },
            select: { id: true },
          });
          categoryCache.set(key, created.id);
          categoriesCreated += 1;
          return created.id;
        }

        async function ensureItem(row: MenuCsvRow) {
          const key = `${row.category.toLowerCase()}|${row.itemName.toLowerCase()}`;
          const cached = itemCache.get(key);
          if (cached) return cached;

          const categoryId = await ensureCategory(row.category);
          const created = await tx.menuItem.create({
            data: {
              businessId,
              categoryId,
              name: row.itemName,
              description: row.description,
              price: row.basePrice,
              imageUrl: row.imageUrl,
              isAvailable: row.available,
            },
            select: { id: true },
          });
          itemCache.set(key, created.id);
          itemsCreated += 1;
          return created.id;
        }

        for (const row of rows) {
          const itemId = await ensureItem(row);

          if (row.variantName && row.variantPrice) {
            const variantKey = `${itemId}|${row.variantName.toLowerCase()}`;
            if (!variantCache.has(variantKey)) {
              const displayOrder = variantOrderByItem.get(itemId) ?? 0;
              const created = await tx.menuItemVariant.create({
                data: {
                  menuItemId: itemId,
                  name: row.variantName,
                  price: row.variantPrice,
                  displayOrder,
                },
                select: { id: true },
              });
              variantOrderByItem.set(itemId, displayOrder + 1);
              variantCache.set(variantKey, created.id);
              variantsCreated += 1;
            }
          }

          if (row.modifierGroupName) {
            const groupKey = row.modifierGroupName.toLowerCase();
            let groupId = groupCache.get(groupKey);

            if (!groupId) {
              const created = await tx.modifierGroup.create({
                data: {
                  businessId,
                  name: row.modifierGroupName,
                  isRequired: row.modifierGroupRequired ?? false,
                  minSelect: row.modifierGroupRequired ? 1 : 0,
                  maxSelect: row.modifierGroupMaxSelect ?? 1,
                },
                select: { id: true },
              });
              groupId = created.id;
              groupCache.set(groupKey, groupId);
              modifierGroupsCreated += 1;
            }

            const linkKey = `${itemId}|${groupId}`;
            if (!linkedGroups.has(linkKey)) {
              await tx.menuItemModifierGroup.upsert({
                where: {
                  menuItemId_modifierGroupId: { menuItemId: itemId, modifierGroupId: groupId },
                },
                update: {},
                create: { menuItemId: itemId, modifierGroupId: groupId },
              });
              linkedGroups.add(linkKey);
              linksCreated += 1;
            }

            if (row.modifierOptionName) {
              const optionKey = `${groupId}|${row.modifierOptionName.toLowerCase()}`;
              if (!optionCache.has(optionKey)) {
                const displayOrder = optionOrderByGroup.get(groupId) ?? 0;
                const created = await tx.modifierOption.create({
                  data: {
                    modifierGroupId: groupId,
                    name: row.modifierOptionName,
                    priceAdjustment: row.modifierOptionPrice ?? '0',
                    displayOrder,
                  },
                  select: { id: true },
                });
                optionOrderByGroup.set(groupId, displayOrder + 1);
                optionCache.set(optionKey, created.id);
                modifierOptionsCreated += 1;
              }
            }
          }
        }

        return {
          categoriesCreated,
          itemsCreated,
          variantsCreated,
          modifierGroupsCreated,
          modifierOptionsCreated,
          linksCreated,
        };
      },
      { maxWait: 10_000, timeout: IMPORT_TX_TIMEOUT_MS },
    );
  }
}
