'use client';

import { useMemo, useState } from 'react';
import { Button, Icon, Input, SelectField } from '@/components/ui';
import { formatApiError } from '@/lib/api/errors';
import type { MenuItem, MenuItemVariant, ModifierGroup } from '@/lib/api/types';
import {
  useCreateMenuItemVariant,
  useCreateModifierGroup,
  useCreateModifierOption,
  useDeleteMenuItemVariant,
  useDeleteModifierGroup,
  useDeleteModifierOption,
  useLinkModifierGroup,
  useUnlinkModifierGroup,
  useUpdateMenuItemVariant,
  useUpdateModifierOption,
} from '@/lib/hooks/mutations';
import { useModifierGroups } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { formatItemProfit } from '@/lib/menu-item-profit';
import { useToast } from '@/lib/toast';
import { InventoryConfigPanel } from '@/components/inventory/inventory-config-panel';
import { menuItemIsByWeight } from '@/lib/order-item-display';

function VariantRow({
  variant,
  onUpdate,
  onDelete,
}: {
  variant: MenuItemVariant;
  onUpdate: (input: {
    price?: string;
    basePrice?: string | null;
    isAvailable?: boolean;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const formatMoney = useFormatMoney();
  const [salePrice, setSalePrice] = useState(String(variant.price));
  const [basePrice, setBasePrice] = useState(
    variant.basePrice != null ? String(variant.basePrice) : '',
  );
  const [saving, setSaving] = useState(false);
  const profitInfo = formatItemProfit(salePrice, basePrice);

  async function savePrices() {
    const nextSale = salePrice.trim();
    const nextBase = basePrice.trim();
    const currentSale = String(variant.price);
    const currentBase = variant.basePrice != null ? String(variant.basePrice) : '';

    if (nextSale === currentSale && nextBase === currentBase) return;
    if (!nextSale) return;

    setSaving(true);
    try {
      await onUpdate({
        price: nextSale,
        basePrice: nextBase ? nextBase : null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-body-emphasis">{variant.name}</p>
          {!variant.isAvailable && (
            <p className="font-caption text-on-surface-variant">Unavailable</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            className="!px-3 !py-1.5 text-sm"
            onClick={() => onUpdate({ isAvailable: !variant.isAvailable })}
          >
            {variant.isAvailable ? 'Disable' : 'Enable'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="!px-3 !py-1.5 text-sm"
            onClick={onDelete}
          >
            <Icon name="delete" className="text-error" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Sale price"
          type="number"
          min={0}
          step="0.01"
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
          onBlur={savePrices}
        />
        <Input
          label="Base price (cost)"
          type="number"
          min={0}
          step="0.01"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          onBlur={savePrices}
          placeholder="Your cost"
        />
      </div>

      {profitInfo && (
        <p className="font-caption text-primary font-semibold">
          Estimated profit {formatMoney(profitInfo.profit)} ({profitInfo.margin}% margin)
        </p>
      )}
      {saving && <p className="font-caption text-on-surface-variant">Saving…</p>}
    </div>
  );
}

export function MenuItemCustomizationPanel({ item }: { item: MenuItem }) {
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { data: allGroups = [], refetch } = useModifierGroups();

  const createVariant = useCreateMenuItemVariant();
  const updateVariant = useUpdateMenuItemVariant();
  const deleteVariant = useDeleteMenuItemVariant();
  const createGroup = useCreateModifierGroup();
  const deleteGroup = useDeleteModifierGroup();
  const createOption = useCreateModifierOption();
  const updateOption = useUpdateModifierOption();
  const deleteOption = useDeleteModifierOption();
  const linkGroup = useLinkModifierGroup();
  const unlinkGroup = useUnlinkModifierGroup();

  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantBasePrice, setVariantBasePrice] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRequired, setNewGroupRequired] = useState(false);
  const [newGroupMaxSelect, setNewGroupMaxSelect] = useState('1');
  const [optionDrafts, setOptionDrafts] = useState<Record<string, { name: string; price: string }>>(
    {},
  );

  const linkedGroupIds = useMemo(
    () => new Set((item.modifierGroups ?? []).map((group) => group.id)),
    [item.modifierGroups],
  );

  const unlinkedGroups = allGroups.filter((group) => !linkedGroupIds.has(group.id));
  const newVariantProfit = formatItemProfit(variantPrice, variantBasePrice);

  async function handleAddVariant() {
    if (!variantName.trim() || !variantPrice.trim()) return;
    try {
      await createVariant.mutateAsync({
        itemId: item.id,
        name: variantName.trim(),
        price: variantPrice.trim(),
        ...(variantBasePrice.trim() ? { basePrice: variantBasePrice.trim() } : {}),
      });
      setVariantName('');
      setVariantPrice('');
      setVariantBasePrice('');
      toast.success('Variant added');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    try {
      const maxSelect = Math.max(1, Number(newGroupMaxSelect) || 1);
      const result = await createGroup.mutateAsync({
        name: newGroupName.trim(),
        isRequired: newGroupRequired,
        minSelect: newGroupRequired ? 1 : 0,
        maxSelect,
      });
      await linkGroup.mutateAsync({
        itemId: item.id,
        modifierGroupId: result.modifierGroup.id,
      });
      setNewGroupName('');
      setNewGroupRequired(false);
      setNewGroupMaxSelect('1');
      await refetch();
      toast.success('Modifier group created and linked');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleLinkGroup(groupId: string) {
    try {
      await linkGroup.mutateAsync({ itemId: item.id, modifierGroupId: groupId });
      toast.success('Modifier group linked');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleAddOption(group: ModifierGroup) {
    const draft = optionDrafts[group.id] ?? { name: '', price: '0' };
    if (!draft.name.trim()) return;
    try {
      await createOption.mutateAsync({
        groupId: group.id,
        name: draft.name.trim(),
        priceAdjustment: draft.price.trim() || '0',
      });
      setOptionDrafts((prev) => ({ ...prev, [group.id]: { name: '', price: '0' } }));
      await refetch();
      toast.success('Option added');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <div className="space-y-8">
      {!menuItemIsByWeight(item) && (
      <section>
        <h3 className="font-title-lg text-primary mb-1">Sizes / Variants</h3>
        <p className="font-caption text-on-surface-variant mb-4">
          Add sizes like Half, Full, or Large — each with its own sale price and base cost for
          profit tracking.
        </p>

        <div className="space-y-2 mb-4">
          {(item.variants ?? []).map((variant) => (
            <VariantRow
              key={variant.id}
              variant={variant}
              onUpdate={async (input) => {
                try {
                  await updateVariant.mutateAsync({ id: variant.id, ...input });
                  if (input.price !== undefined || input.basePrice !== undefined) {
                    toast.success('Variant prices updated');
                  }
                } catch (err) {
                  toast.error(formatApiError(err));
                }
              }}
              onDelete={async () => {
                try {
                  await deleteVariant.mutateAsync(variant.id);
                  toast.success('Variant removed');
                } catch (err) {
                  toast.error(formatApiError(err));
                }
              }}
            />
          ))}
          {!item.variants?.length && (
            <p className="font-caption text-on-surface-variant">No variants yet.</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_120px_120px_auto] gap-2">
          <Input
            label="Variant name"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            placeholder="e.g. Half, Full, Large"
          />
          <Input
            label="Sale price"
            type="number"
            min={0}
            step="0.01"
            value={variantPrice}
            onChange={(e) => setVariantPrice(e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Base price"
            type="number"
            min={0}
            step="0.01"
            value={variantBasePrice}
            onChange={(e) => setVariantBasePrice(e.target.value)}
            placeholder="Cost"
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddVariant}
              disabled={createVariant.isPending}
            >
              Add
            </Button>
          </div>
        </div>
        {newVariantProfit && (
          <p className="font-caption text-primary font-semibold mt-2">
            Estimated profit {formatMoney(newVariantProfit.profit)} ({newVariantProfit.margin}% margin)
          </p>
        )}

        {(item.variants ?? []).map((variant) => (
          <InventoryConfigPanel
            key={`inv-${variant.id}`}
            targetType="variant"
            targetId={variant.id}
            title={`${variant.name} inventory (stock link)`}
          />
        ))}
        {!item.variants?.length && (
          <InventoryConfigPanel targetType="item" targetId={item.id} title="Item inventory (stock link)" />
        )}
      </section>
      )}

      {menuItemIsByWeight(item) && (
        <InventoryConfigPanel targetType="item" targetId={item.id} title="Item inventory (stock link)" />
      )}

      <section>
        <h3 className="font-title-lg text-primary mb-1">Customizations</h3>
        <p className="font-caption text-on-surface-variant mb-4">
          Link modifier groups like Crust, Toppings, or Extras. Create groups once and reuse them
          across items.
        </p>

        <div className="space-y-4 mb-6">
          {(item.modifierGroups ?? []).map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-outline-variant/20 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 p-3 bg-surface-container">
                <div>
                  <p className="font-body-emphasis">{group.name}</p>
                  <p className="font-caption text-on-surface-variant">
                    {group.isRequired ? 'Required' : 'Optional'} ·{' '}
                    {group.maxSelect <= 1 ? 'Choose one' : `Choose up to ${group.maxSelect}`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-3 !py-1.5 text-sm"
                  onClick={async () => {
                    try {
                      await unlinkGroup.mutateAsync({ itemId: item.id, groupId: group.id });
                      toast.success('Group unlinked');
                    } catch (err) {
                      toast.error(formatApiError(err));
                    }
                  }}
                >
                  Unlink
                </Button>
              </div>
              <div className="p-3 space-y-2">
                {group.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      {option.name}
                      {Number(option.priceAdjustment) !== 0 &&
                        ` (+${formatMoney(option.priceAdjustment)})`}
                      {!option.isAvailable && (
                        <span className="text-on-surface-variant"> · unavailable</span>
                      )}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="font-caption text-secondary hover:underline cursor-pointer"
                        onClick={async () => {
                          try {
                            await updateOption.mutateAsync({
                              id: option.id,
                              isAvailable: !option.isAvailable,
                            });
                            await refetch();
                          } catch (err) {
                            toast.error(formatApiError(err));
                          }
                        }}
                      >
                        {option.isAvailable ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="font-caption text-error hover:underline cursor-pointer"
                        onClick={async () => {
                          try {
                            await deleteOption.mutateAsync(option.id);
                            await refetch();
                          } catch (err) {
                            toast.error(formatApiError(err));
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_auto] gap-2 pt-2">
                  <Input
                    label="Option name"
                    value={optionDrafts[group.id]?.name ?? ''}
                    onChange={(e) =>
                      setOptionDrafts((prev) => ({
                        ...prev,
                        [group.id]: {
                          name: e.target.value,
                          price: prev[group.id]?.price ?? '0',
                        },
                      }))
                    }
                    placeholder="e.g. Extra Cheese"
                  />
                  <Input
                    label="+ Price"
                    value={optionDrafts[group.id]?.price ?? '0'}
                    onChange={(e) =>
                      setOptionDrafts((prev) => ({
                        ...prev,
                        [group.id]: {
                          name: prev[group.id]?.name ?? '',
                          price: e.target.value,
                        },
                      }))
                    }
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-3 !py-1.5 text-sm"
                      onClick={() => handleAddOption(group)}
                    >
                      Add option
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {unlinkedGroups.length > 0 && (
          <div className="mb-6">
            <SelectField
              label="Link existing group"
              value=""
              onChange={(e) => {
                if (e.target.value) handleLinkGroup(e.target.value);
              }}
              options={[
                { value: '', label: 'Select a modifier group…' },
                ...unlinkedGroups.map((group) => ({ value: group.id, label: group.name })),
              ]}
            />
          </div>
        )}

        <div className="rounded-xl border border-dashed border-outline-variant/30 p-4 space-y-3">
          <p className="font-body-emphasis">Create new modifier group</p>
          <Input
            label="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="e.g. Crust, Toppings, Spice level"
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Selection type"
              value={newGroupMaxSelect === '1' ? 'single' : 'multiple'}
              onChange={(e) =>
                setNewGroupMaxSelect(e.target.value === 'single' ? '1' : '5')
              }
              options={[
                { value: 'single', label: 'Choose one' },
                { value: 'multiple', label: 'Choose multiple' },
              ]}
            />
            <SelectField
              label="Required?"
              value={newGroupRequired ? 'yes' : 'no'}
              onChange={(e) => setNewGroupRequired(e.target.value === 'yes')}
              options={[
                { value: 'no', label: 'Optional' },
                { value: 'yes', label: 'Required' },
              ]}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCreateGroup}
            disabled={createGroup.isPending}
          >
            Create & link to item
          </Button>
        </div>

        {allGroups.length > 0 && (
          <div className="mt-6 pt-4 border-t border-outline-variant/10">
            <p className="font-caption text-on-surface-variant mb-2">All business modifier groups</p>
            <div className="flex flex-wrap gap-2">
              {allGroups.map((group) => (
                <span
                  key={group.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container text-xs"
                >
                  {group.name}
                  {!linkedGroupIds.has(group.id) && (
                    <button
                      type="button"
                      className="text-secondary hover:underline cursor-pointer"
                      onClick={() => handleLinkGroup(group.id)}
                    >
                      link
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-error hover:underline cursor-pointer"
                    onClick={async () => {
                      try {
                        await deleteGroup.mutateAsync(group.id);
                        await refetch();
                        toast.success('Group deleted');
                      } catch (err) {
                        toast.error(formatApiError(err));
                      }
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4 mt-6">
          {(item.modifierGroups ?? []).flatMap((group) =>
            group.options.map((option) => (
              <InventoryConfigPanel
                key={`inv-mod-${option.id}`}
                targetType="modifier"
                targetId={option.id}
                title={`${option.name} inventory (stock link)`}
              />
            )),
          )}
        </div>
      </section>
    </div>
  );
}
