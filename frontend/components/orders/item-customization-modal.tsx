'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import type { MenuItem, ModifierGroup, InventoryAvailabilityMap } from '@/lib/api/types';
import {
  CartLineSelection,
  groupSelectionHint,
  isCustomizationValid,
  isSellableInventoryOk,
  itemHasVariants,
  lineUnitPrice,
} from '@/lib/cart-line';
import { menuItemIsByWeight } from '@/lib/order-item-display';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';

export function ItemCustomizationModal({
  item,
  open,
  onClose,
  onConfirm,
  initialSelection,
  confirmLabel = 'Add to order',
  inventoryAvailability,
  themeStyle,
}: {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
  onConfirm: (selection: CartLineSelection) => void;
  initialSelection?: CartLineSelection;
  confirmLabel?: string;
  inventoryAvailability?: InventoryAvailabilityMap;
  themeStyle?: CSSProperties;
}) {
  const formatMoney = useFormatMoney();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!open) return;
    setVariantId(initialSelection?.variantId ?? null);
    const next: Record<string, string[]> = {};
    for (const group of item.modifierGroups ?? []) {
      const picks = (initialSelection?.modifierOptionIds ?? []).filter((optionId) =>
        group.options.some((option) => option.id === optionId),
      );
      if (picks.length) next[group.id] = picks;
    }
    setSelected(next);
  }, [open, item.id, initialSelection]);

  const modifierOptionIds = useMemo(() => Object.values(selected).flat(), [selected]);
  const selection: CartLineSelection = {
    variantId: menuItemIsByWeight(item) ? null : variantId,
    weightG: initialSelection?.weightG ?? null,
    modifierOptionIds,
  };
  const isValid = isCustomizationValid(item, selection);
  const totalPrice = lineUnitPrice(
    item,
    modifierOptionIds,
    selection.variantId,
    selection.weightG,
  );

  function toggleOption(group: ModifierGroup, optionId: string) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      const isSelected = current.includes(optionId);
      if (group.maxSelect <= 1) {
        return { ...prev, [group.id]: isSelected ? [] : [optionId] };
      }
      if (isSelected) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  function handleConfirm() {
    if (!isValid) return;
    onConfirm(selection);
    onClose();
  }

  const availableVariants = menuItemIsByWeight(item)
    ? []
    : (item.variants ?? []).filter(
        (variant) =>
          variant.isAvailable &&
          isSellableInventoryOk(inventoryAvailability, item.id, variant.id, []),
      );

  return (
    <Modal
      open={open}
      onClose={onClose}
      themeStyle={themeStyle}
      title={item.name}
      description="Customize your selection"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-left">
            <p className="font-caption text-on-surface-variant">Total</p>
            <p className="font-title-lg text-primary">{formatMoney(totalPrice)}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={!isValid} onClick={handleConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
        {itemHasVariants(item) && (
          <div>
            <p className="font-body-emphasis mb-1">
              Size <span className="text-error">*</span>
            </p>
            <p className="font-caption text-on-surface-variant mb-2">Required · Choose one</p>
            <div className="space-y-2">
              {availableVariants.map((variant) => {
                const checked = variantId === variant.id;
                return (
                  <label
                    key={variant.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer ${
                      checked
                        ? 'border-secondary bg-secondary/5'
                        : 'border-outline-variant/20 hover:border-outline-variant/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`variant-${item.id}`}
                        checked={checked}
                        onChange={() => setVariantId(variant.id)}
                      />
                      <span className="font-body-base">{variant.name}</span>
                    </span>
                    <span className="font-caption text-on-surface-variant">
                      {formatMoney(variant.price)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {(item.modifierGroups ?? []).map((group) => (
          <div key={group.id}>
            <p className="font-body-emphasis mb-1">
              {group.name}
              {group.isRequired && <span className="text-error"> *</span>}
            </p>
            <p className="font-caption text-on-surface-variant mb-2">{groupSelectionHint(group)}</p>
            <div className="space-y-2">
              {group.options
                .filter(
                  (option) =>
                    option.isAvailable &&
                    isSellableInventoryOk(inventoryAvailability, item.id, variantId, [option.id]),
                )
                .map((option) => {
                  const checked = (selected[group.id] ?? []).includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer ${
                        checked
                          ? 'border-secondary bg-secondary/5'
                          : 'border-outline-variant/20 hover:border-outline-variant/40'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type={group.maxSelect <= 1 ? 'radio' : 'checkbox'}
                          name={group.id}
                          checked={checked}
                          onChange={() => toggleOption(group, option.id)}
                        />
                        <span className="font-body-base">{option.name}</span>
                      </span>
                      {Number(option.priceAdjustment) !== 0 && (
                        <span className="font-caption text-on-surface-variant">
                          +{formatMoney(option.priceAdjustment)}
                        </span>
                      )}
                    </label>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
