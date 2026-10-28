'use client';

import { use, useMemo, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { MenuItemImageField } from '@/components/files/menu-item-image-field';
import { MenuItemCustomizationPanel } from '@/components/menu/menu-item-customization-panel';
import { MenuImportModal } from '@/components/menu/menu-import-modal';
import { Button, Icon, Input, SelectField, Textarea, ListCardSkeleton, Skeleton } from '@/components/ui';
import { ConfirmDialog, Drawer, Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import {
  useCreateCategory,
  useCreateMenuItem,
  useDeleteCategory,
  useDeleteMenuItem,
  useUpdateMenuItem,
} from '@/lib/hooks/mutations';
import { useMenu } from '@/lib/hooks/queries';
import { useFormatMoney, useBusinessCurrency } from '@/lib/hooks/use-business-currency';
import { getItemDisplayPrice } from '@/lib/cart-line';
import { formatItemProfit } from '@/lib/menu-item-profit';
import { useToast } from '@/lib/toast';
import type { MenuItem } from '@/lib/api/types';
import {
  PRICING_UNIT_OPTIONS,
  pricePerKgFromUnitPrice,
} from '@/lib/pricing/weight-line-pricing';
import { menuItemIsByWeight } from '@/lib/order-item-display';

const ALL_CATEGORIES_ID = '__all__';

export default function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const formatMoney = useFormatMoney();
  const currency = useBusinessCurrency();
  const toast = useToast();
  const { data: menuData, isLoading } = useMenu();
  const categories = menuData?.menu ?? [];
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [itemDrawer, setItemDrawer] = useState<'create' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{
    id: string;
    name: string;
    itemCount: number;
  } | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    basePrice: '',
    imageUrl: null as string | null,
    categoryId: '',
    pricingType: 'fixed' as 'fixed' | 'by_weight',
    pricePerUnit: '',
    pricingUnitG: 1000,
    minWeightG: '',
    weightStepG: '',
    quickWeightsG: '250,500,750,1000',
    priceRounding: '' as '' | '1' | '5' | '10',
  });

  function weightFieldsFromItem(item: MenuItem) {
    const unitG = item.pricingUnitG ?? 1000;
    const perKg = Number(item.pricePerKg ?? item.price);
    const perUnit = (perKg * unitG) / 1000;
    return {
      pricingType: menuItemIsByWeight(item) ? ('by_weight' as const) : ('fixed' as const),
      pricePerUnit: menuItemIsByWeight(item) ? String(perUnit) : '',
      pricingUnitG: unitG,
      minWeightG: item.minWeightG != null ? String(item.minWeightG) : '',
      weightStepG: item.weightStepG != null ? String(item.weightStepG) : '',
      quickWeightsG: item.quickWeightsG?.length
        ? item.quickWeightsG.join(',')
        : '250,500,750,1000',
      priceRounding: (item.priceRounding === 1 || item.priceRounding === 5 || item.priceRounding === 10
        ? String(item.priceRounding)
        : '') as '' | '1' | '5' | '10',
    };
  }

  function buildItemApiPayload() {
    const quickWeightsG = itemForm.quickWeightsG
      .split(/[,;\s]+/)
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    const shared = {
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || undefined,
      basePrice: itemForm.basePrice.trim() ? itemForm.basePrice.trim() : null,
      imageUrl: itemForm.imageUrl,
    };
    if (itemForm.pricingType === 'by_weight') {
      return {
        ...shared,
        pricingType: 'by_weight' as const,
        pricePerUnit: itemForm.pricePerUnit.trim(),
        pricingUnitG: itemForm.pricingUnitG,
        minWeightG: itemForm.minWeightG.trim() ? Number(itemForm.minWeightG) : null,
        weightStepG: itemForm.weightStepG.trim() ? Number(itemForm.weightStepG) : null,
        quickWeightsG: quickWeightsG.length ? quickWeightsG : null,
        priceRounding: itemForm.priceRounding ? Number(itemForm.priceRounding) : null,
      };
    }
    return {
      ...shared,
      pricingType: 'fixed' as const,
      price: itemForm.price.trim(),
    };
  }
  const [error, setError] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);

  const activeCategoryId = selectedCategoryId ?? categories[0]?.id ?? null;
  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const isAllCategoriesView = activeCategoryId === ALL_CATEGORIES_ID;

  const visibleItems = useMemo(() => {
    if (isAllCategoriesView) {
      return categories.flatMap((cat) =>
        (cat.items ?? []).map((item) => ({ item, categoryName: cat.name, categoryId: cat.id })),
      );
    }
    if (!activeCategory) return [];
    return (activeCategory.items ?? []).map((item) => ({
      item,
      categoryName: activeCategory.name,
      categoryId: activeCategory.id,
    }));
  }, [activeCategory, categories, isAllCategoriesView]);

  const editingItemLive = useMemo(() => {
    if (!editingItem) return null;
    for (const category of categories) {
      const match = category.items?.find((item) => item.id === editingItem.id);
      if (match) return match;
    }
    return editingItem;
  }, [categories, editingItem]);

  function openCreateItem() {
    setEditingItem(null);
    setItemForm({
      name: '',
      description: '',
      price: '',
      basePrice: '',
      imageUrl: null,
      categoryId: isAllCategoriesView ? categories[0]?.id ?? '' : activeCategoryId ?? '',
      pricingType: 'fixed',
      pricePerUnit: '',
      pricingUnitG: 1000,
      minWeightG: '',
      weightStepG: '',
      quickWeightsG: '250,500,750,1000',
      priceRounding: '',
    });
    setError('');
    setItemDrawer('create');
  }

  function openEditItem(item: MenuItem) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description ?? '',
      price: String(item.price),
      basePrice: item.basePrice != null ? String(item.basePrice) : '',
      imageUrl: item.imageUrl ?? null,
      categoryId: item.categoryId,
      ...weightFieldsFromItem(item),
    });
    setError('');
    setItemDrawer('edit');
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createCategory.mutateAsync({ name: categoryName.trim() });
      toast.success('Category created');
      setCategoryName('');
      setCategoryModal(false);
    } catch (err) {
      setError(formatApiError(err));
      toast.error(formatApiError(err));
    }
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    const targetCategoryId = itemForm.categoryId || activeCategoryId;
    if (!targetCategoryId && itemDrawer === 'create') return;
    setError('');
    try {
      const payload = buildItemApiPayload();
      if (itemDrawer === 'edit' && editingItem) {
        await updateItem.mutateAsync({
          id: editingItem.id,
          ...payload,
          ...(itemForm.categoryId && itemForm.categoryId !== editingItem.categoryId
            ? { categoryId: itemForm.categoryId }
            : {}),
        });
        toast.success('Menu item updated');
      } else {
        await createItem.mutateAsync({
          categoryId: targetCategoryId!,
          ...payload,
        });
        toast.success('Menu item added');
      }
      setItemDrawer(null);
    } catch (err) {
      setError(formatApiError(err));
      toast.error(formatApiError(err));
    }
  }

  function toggleAvailability(item: MenuItem) {
    const nextAvailable = !item.isAvailable;
    updateItem.mutate(
      { id: item.id, isAvailable: nextAvailable },
      {
        onSuccess: () => {
          const next = { ...item, isAvailable: nextAvailable };
          if (editingItem?.id === item.id) setEditingItem(next);
          toast.success(nextAvailable ? 'Marked available' : 'Marked unavailable');
        },
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteItem.mutateAsync(deleteTarget.id);
      toast.success('Item removed');
      setDeleteTarget(null);
      if (editingItem?.id === deleteTarget.id) setItemDrawer(null);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  function requestDeleteCategory(cat: { id: string; name: string; items?: MenuItem[] }) {
    setDeleteCategoryTarget({
      id: cat.id,
      name: cat.name,
      itemCount: cat.items?.length ?? 0,
    });
  }

  async function confirmDeleteCategory() {
    if (!deleteCategoryTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteCategoryTarget.id);
      toast.success('Category deleted');
      if (selectedCategoryId === deleteCategoryTarget.id) {
        setSelectedCategoryId(ALL_CATEGORIES_ID);
      }
      setDeleteCategoryTarget(null);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <BusinessLayout slug={slug} showHeaderTitle={false}>
      <PageHeader
        icon="restaurant_menu"
        title="Menu Editor"
        description="Manage categories, items, pricing, and availability."
        actions={
          <>
            <Button
              variant="secondary"
              className="w-full sm:w-auto justify-center order-first sm:order-last"
              onClick={openCreateItem}
              disabled={!categories.length}
            >
              <Icon name="add" className="text-lg" />
              Add Item
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto justify-center"
              onClick={() => setImportModalOpen(true)}
            >
              <Icon name="upload_file" className="text-lg" />
              Import CSV
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto justify-center"
              onClick={() => setCategoryModal(true)}
            >
              <Icon name="folder" className="text-lg" />
              New Category
            </Button>
          </>
        }
      />

      <MenuImportModal open={importModalOpen} onClose={() => setImportModalOpen(false)} />

      <div className="flex min-h-[480px] w-full min-w-0 max-w-full rounded-xl card-hairline overflow-hidden bg-surface-container-lowest">
        <nav className="w-56 shrink-0 border-r border-outline-variant/10 p-4 hidden md:block">
          <p className="font-caption text-on-surface-variant uppercase tracking-wider font-bold px-3 pb-3">
            Categories
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(ALL_CATEGORIES_ID)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                isAllCategoriesView
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className={isAllCategoriesView ? 'font-body-emphasis' : ''}>All items</span>
              <span className="font-caption">
                {categories.reduce((sum, cat) => sum + (cat.items?.length ?? 0), 0)}
              </span>
            </button>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`group flex items-center gap-1 rounded-lg transition-colors ${
                  activeCategoryId === cat.id
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="flex-1 flex items-center justify-between px-3 py-2.5 text-left min-w-0"
                >
                  <span className={`truncate ${activeCategoryId === cat.id ? 'font-body-emphasis' : ''}`}>
                    {cat.name}
                  </span>
                  <span className="font-caption shrink-0 ml-2">{cat.items?.length ?? 0}</span>
                </button>
                <button
                  type="button"
                  title={`Delete ${cat.name}`}
                  onClick={() => requestDeleteCategory(cat)}
                  className="shrink-0 p-2 mr-1 rounded-md hover:bg-error-container/40 text-error md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                >
                  <Icon name="delete" className="text-base" />
                </button>
              </div>
            ))}
          </div>
        </nav>

        <section className="flex-1 p-4 md:p-8 min-w-0 w-full max-w-full overflow-hidden">
          {categories.length > 0 && (
            <div className="md:hidden mb-4 space-y-3 w-full min-w-0">
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar w-full max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(ALL_CATEGORIES_ID)}
                  className={`shrink-0 px-4 py-2 rounded-full font-body-emphasis text-sm border transition-colors ${
                    isAllCategoriesView
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface border-outline-variant/30 text-on-surface-variant'
                  }`}
                >
                  All items
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`shrink-0 px-4 py-2 rounded-full font-body-emphasis text-sm border transition-colors ${
                      activeCategoryId === cat.id
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface border-outline-variant/30 text-on-surface-variant'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isLoading && categories.length > 0 && (
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-headline text-lg">
                  {isAllCategoriesView ? 'All menu items' : activeCategory?.name}
                </h3>
                <p className="font-caption text-on-surface-variant mt-1">
                  {visibleItems.length} item{visibleItems.length === 1 ? '' : 's'}
                  {!isAllCategoriesView && activeCategory
                    ? ` in ${activeCategory.name}`
                    : ' across all categories'}
                </p>
              </div>
              {!isAllCategoriesView && activeCategory && (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 text-error border-error/30 hover:bg-error-container/20 !h-8 !px-2 md:!h-10 md:!px-4 !text-xs md:!text-sm"
                  onClick={() => requestDeleteCategory(activeCategory)}
                  aria-label="Delete category"
                >
                  <Icon name="delete" className="text-base md:text-lg" />
                  <span className="hidden md:inline">Delete category</span>
                </Button>
              )}
            </div>
          )}
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full max-w-xs" />
              <ListCardSkeleton count={4} />
            </div>
          )}

          {!isLoading && categories.length === 0 && (
            <EmptyState
              icon="restaurant_menu"
              title="Build your menu"
              description="Create categories like Coffee, Pastries, and Sandwiches to get started."
              action={
                <Button variant="secondary" onClick={() => setCategoryModal(true)}>
                  Create first category
                </Button>
              }
            />
          )}

          {(activeCategory || isAllCategoriesView) && visibleItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 w-full min-w-0">
              {visibleItems.map(({ item, categoryName }) => {
                const hasVariants = (item.variants?.length ?? 0) > 0;
                const variantProfits = (item.variants ?? [])
                  .map((variant) => formatItemProfit(variant.price, variant.basePrice))
                  .filter(Boolean);
                const profitInfo = hasVariants
                  ? null
                  : formatItemProfit(item.price, item.basePrice);
                return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openEditItem(item)}
                  className={`group text-left bg-surface border rounded-xl overflow-hidden transition-all hover:shadow-[0px_4px_12px_rgba(0,0,0,0.06)] hover:border-outline-variant/50 ${
                    item.isAvailable ? 'border-outline-variant/30' : 'opacity-75'
                  }`}
                >
                  <div className="h-32 bg-gradient-to-br from-primary-fixed via-surface-container to-secondary-fixed/20 flex items-center justify-center overflow-hidden relative">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon name="local_cafe" className="text-5xl text-primary/20" filled />
                    )}
                    {isAllCategoriesView && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-surface/90 text-secondary font-caption font-bold uppercase tracking-wide">
                        {categoryName}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    {isAllCategoriesView && (
                      <p className="font-caption text-on-surface-variant uppercase tracking-wide mb-1 truncate">
                        {categoryName}
                      </p>
                    )}
                    <h4 className="font-title text-base text-on-surface leading-snug line-clamp-2 mb-1">
                      {item.name}
                    </h4>
                    <div className="mb-3 space-y-0.5">
                      <p className="font-caption text-on-surface-variant">
                        Sale:{' '}
                        {(item.variants?.length ?? 0) > 0
                          ? `From ${formatMoney(getItemDisplayPrice(item))}`
                          : formatMoney(item.price)}
                      </p>
                      {!hasVariants && item.basePrice != null && item.basePrice !== '' && (
                        <>
                          <p className="font-caption text-on-surface-variant">
                            Cost: {formatMoney(item.basePrice)}
                          </p>
                          {profitInfo && (
                            <p className="font-caption text-primary font-semibold">
                              Estimated profit {formatMoney(profitInfo.profit)} ({profitInfo.margin}% margin)
                            </p>
                          )}
                        </>
                      )}
                      {hasVariants && variantProfits.length > 0 && (
                        <p className="font-caption text-primary font-semibold">
                          Estimated profit{' '}
                          {variantProfits.length === 1
                            ? formatMoney(variantProfits[0]!.profit)
                            : `${formatMoney(Math.min(...variantProfits.map((p) => p!.profit)))} – ${formatMoney(Math.max(...variantProfits.map((p) => p!.profit)))}`}
                        </p>
                      )}
                    </div>
                    {((item.variants?.length ?? 0) > 0 ||
                      (item.modifierGroups?.length ?? 0) > 0) && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(item.variants?.length ?? 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-caption">
                            {item.variants!.length} size{item.variants!.length === 1 ? '' : 's'}
                          </span>
                        )}
                        {(item.modifierGroups?.length ?? 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-caption">
                            {item.modifierGroups!.length} customization
                            {item.modifierGroups!.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                      <span
                        className={`font-caption font-bold ${
                          item.isAvailable ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                      <span className="font-caption text-on-surface-variant opacity-0 group-hover:opacity-100">
                        Edit →
                      </span>
                    </div>
                  </div>
                </button>
                );
              })}
            </div>
          )}

          {!isLoading && !isAllCategoriesView && activeCategory && !visibleItems.length && (
            <EmptyState
              icon="coffee"
              title={`No items in ${activeCategory.name}`}
              description="Add your first item to this category."
              action={
                <Button variant="secondary" onClick={openCreateItem}>
                  Add menu item
                </Button>
              }
            />
          )}
          {!isLoading && isAllCategoriesView && !visibleItems.length && (
            <EmptyState
              icon="coffee"
              title="No menu items yet"
              description="Add items to your categories to build the menu."
              action={
                <Button variant="secondary" onClick={openCreateItem}>
                  Add menu item
                </Button>
              }
            />
          )}
        </section>
      </div>

      <Modal
        open={categoryModal}
        onClose={() => {
          setCategoryModal(false);
          setError('');
        }}
        title="New category"
        description="Group related menu items together."
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setCategoryModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="category-form"
              loading={createCategory.isPending}
            >
              Create category
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleAddCategory} className="space-y-4">
          <Input
            label="Category name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="e.g. Coffee, Pastries"
            required
            autoFocus
          />
          {error && <p className="font-caption text-error">{error}</p>}
        </form>
      </Modal>

      <Drawer
        open={itemDrawer !== null}
        onClose={() => {
          setItemDrawer(null);
          setError('');
        }}
        title={itemDrawer === 'edit' ? `Edit ${editingItem?.name}` : 'Add menu item'}
        width="lg"
        footer={
          <>
            {itemDrawer === 'edit' && editingItem && (
              <Button variant="ghost" type="button" onClick={() => setDeleteTarget(editingItem)}>
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" type="button" onClick={() => setItemDrawer(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="item-form"
              loading={createItem.isPending || updateItem.isPending}
            >
              Save changes
            </Button>
          </>
        }
      >
        <form id="item-form" onSubmit={handleSaveItem} className="space-y-6">
          <MenuItemImageField
            value={itemForm.imageUrl}
            onChange={(imageUrl) => setItemForm((f) => ({ ...f, imageUrl }))}
          />
          <Input
            label="Item name"
            value={itemForm.name}
            onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <SelectField
            label="Category"
            value={itemForm.categoryId}
            onChange={(e) => setItemForm((f) => ({ ...f, categoryId: e.target.value }))}
            required
            options={[
              { value: '', label: 'Select category' },
              ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
            ]}
          />
          <SelectField
            label="Pricing type"
            value={itemForm.pricingType}
            onChange={(e) =>
              setItemForm((f) => ({
                ...f,
                pricingType: e.target.value as 'fixed' | 'by_weight',
              }))
            }
            options={[
              { value: 'fixed', label: 'Fixed price (sizes/variants)' },
              { value: 'by_weight', label: 'Sell by weight' },
            ]}
          />

          {itemForm.pricingType === 'fixed' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={`Sale price (${currency})`}
                type="number"
                min={0}
                step="0.01"
                value={itemForm.price}
                onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="450"
                required
                hint="What the customer pays"
              />
              <Input
                label={`Base price (${currency})`}
                type="number"
                min={0}
                step="0.01"
                value={itemForm.basePrice}
                onChange={(e) => setItemForm((f) => ({ ...f, basePrice: e.target.value }))}
                placeholder="280"
                hint="Your cost — used to estimate profit"
              />
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="font-caption text-on-surface-variant">
                Cashiers enter weight at the till; price is calculated from your per-kg rate.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Price per unit"
                  type="number"
                  min={0}
                  step="0.01"
                  value={itemForm.pricePerUnit}
                  onChange={(e) => setItemForm((f) => ({ ...f, pricePerUnit: e.target.value }))}
                  required
                  hint="Amount for the pricing unit below"
                />
                <SelectField
                  label="Pricing unit"
                  value={String(itemForm.pricingUnitG)}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, pricingUnitG: Number(e.target.value) }))
                  }
                  options={PRICING_UNIT_OPTIONS.map((o) => ({
                    value: String(o.grams),
                    label: o.label,
                  }))}
                />
              </div>
              {itemForm.pricePerUnit.trim() && (
                <p className="font-caption text-primary font-semibold">
                  Stored as{' '}
                  {formatMoney(
                    pricePerKgFromUnitPrice(
                      Number(itemForm.pricePerUnit),
                      itemForm.pricingUnitG,
                    ),
                  )}{' '}
                  per kg
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Minimum weight (grams)"
                  type="number"
                  min={1}
                  value={itemForm.minWeightG}
                  onChange={(e) => setItemForm((f) => ({ ...f, minWeightG: e.target.value }))}
                  placeholder="100"
                />
                <Input
                  label="Weight step (grams)"
                  type="number"
                  min={1}
                  value={itemForm.weightStepG}
                  onChange={(e) => setItemForm((f) => ({ ...f, weightStepG: e.target.value }))}
                  placeholder="50"
                />
              </div>
              <Input
                label="Quick weight buttons (grams, comma-separated)"
                value={itemForm.quickWeightsG}
                onChange={(e) => setItemForm((f) => ({ ...f, quickWeightsG: e.target.value }))}
                placeholder="250,500,750,1000"
              />
              <SelectField
                label="Price rounding"
                value={itemForm.priceRounding}
                onChange={(e) =>
                  setItemForm((f) => ({
                    ...f,
                    priceRounding: e.target.value as '' | '1' | '5' | '10',
                  }))
                }
                options={[
                  { value: '', label: 'None' },
                  { value: '1', label: 'Nearest Rs 1' },
                  { value: '5', label: 'Nearest Rs 5' },
                  { value: '10', label: 'Nearest Rs 10' },
                ]}
              />
              <Input
                label={`Base price (${currency})`}
                type="number"
                min={0}
                step="0.01"
                value={itemForm.basePrice}
                onChange={(e) => setItemForm((f) => ({ ...f, basePrice: e.target.value }))}
                hint="Optional cost per sold unit for profit reports"
              />
            </div>
          )}
          {itemForm.pricingType === 'fixed' && (editingItemLive?.variants?.length ?? 0) === 0 &&
            (() => {
              const profitInfo = formatItemProfit(itemForm.price, itemForm.basePrice);
              if (!profitInfo) return null;
              return (
                <p className="font-caption text-primary font-semibold rounded-lg bg-primary/5 px-3 py-2">
                  Estimated profit per item: {formatMoney(profitInfo.profit)} ({profitInfo.margin}% margin)
                </p>
              );
            })()}
          {itemForm.pricingType === 'fixed' && (editingItemLive?.variants?.length ?? 0) > 0 && (
            <p className="font-caption text-on-surface-variant rounded-lg bg-surface-container-low px-3 py-2">
              This item has sizes/variants — set sale and base price on each variant in the section below.
            </p>
          )}
          {itemDrawer === 'edit' && editingItem && (
            <div className="space-y-1.5">
              <label className="font-caption text-on-surface-variant font-bold block">
                Availability
              </label>
              <button
                type="button"
                onClick={() => toggleAvailability(editingItem)}
                className={`w-full h-11 px-4 rounded-lg border font-body-emphasis transition-colors ${
                  editingItem.isAvailable
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-outline-variant/30 text-on-surface-variant'
                }`}
              >
                {editingItem.isAvailable ? 'Available' : 'Unavailable'}
              </button>
            </div>
          )}
          <Textarea
            label="Description"
            rows={3}
            value={itemForm.description}
            onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short description for staff and customers"
          />
          {error && <p className="font-caption text-error">{error}</p>}
        </form>

        {itemDrawer === 'edit' && editingItemLive && (
          <div className="mt-8 pt-8 border-t border-outline-variant/10">
            <MenuItemCustomizationPanel
              item={{
                ...editingItemLive,
                pricingType:
                  itemForm.pricingType === 'by_weight' ? 'BY_WEIGHT' : editingItemLive.pricingType,
              }}
            />
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete menu item"
        message={`Remove "${deleteTarget?.name}" from your menu? This cannot be undone.`}
        confirmLabel="Delete item"
        destructive
        loading={deleteItem.isPending}
      />

      <ConfirmDialog
        open={!!deleteCategoryTarget}
        onClose={() => setDeleteCategoryTarget(null)}
        onConfirm={confirmDeleteCategory}
        title="Delete category"
        message={
          deleteCategoryTarget
            ? deleteCategoryTarget.itemCount > 0
              ? `Delete "${deleteCategoryTarget.name}" and its ${deleteCategoryTarget.itemCount} item${
                  deleteCategoryTarget.itemCount === 1 ? '' : 's'
                }? Past orders will keep the item names and prices already recorded. This cannot be undone.`
              : `Delete "${deleteCategoryTarget.name}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete category"
        destructive
        loading={deleteCategory.isPending}
      />
    </BusinessLayout>
  );
}
