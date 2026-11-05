'use client';

import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { MenuItemImageField } from '@/components/files/menu-item-image-field';
import { MenuItemCustomizationPanel } from '@/components/menu/menu-item-customization-panel';
import { Button, Input, SelectField, Textarea } from '@/components/ui';
import { Drawer } from '@/components/ui/modal';
import { useFormatMoney, useBusinessCurrency } from '@/lib/hooks/use-business-currency';
import {
  getMenuItemAvailabilityLabel,
  isMenuItemEditorAvailable,
} from '@/lib/menu-item-sellability';
import { formatItemProfit } from '@/lib/menu-item-profit';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import {
  PRICING_UNIT_OPTIONS,
  pricePerKgFromUnitPrice,
} from '@/lib/pricing/weight-line-pricing';

export type MenuItemFormState = {
  name: string;
  description: string;
  price: string;
  basePrice: string;
  imageUrl: string | null;
  categoryId: string;
  pricingType: 'fixed' | 'by_weight';
  pricePerUnit: string;
  pricingUnitG: number;
  minWeightG: string;
  weightStepG: string;
  quickWeightsG: string;
  priceRounding: '' | '1' | '5' | '10';
};

const STEP_LABELS_CREATE = ['Basics', 'Pricing', 'Details'] as const;
const STEP_LABELS_EDIT = ['Basics', 'Pricing', 'Details', 'Sizes & add-ons'] as const;

function StepIndicator({
  labels,
  current,
  onGoTo,
}: {
  labels: readonly string[];
  current: number;
  onGoTo: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Editor steps"
      className="flex flex-wrap gap-2 pb-4 mb-2 border-b border-outline-variant/15"
    >
      {labels.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <button
            key={label}
            type="button"
            disabled={i > current}
            onClick={() => done && onGoTo(i)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-caption font-semibold transition-colors ${
              active
                ? 'bg-primary text-on-primary'
                : done
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : 'bg-surface-container-low text-on-surface-variant'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                active ? 'bg-on-primary/20' : done ? 'bg-primary/20' : 'bg-outline-variant/20'
              }`}
            >
              {i + 1}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export function MenuItemEditorDrawer({
  open,
  mode,
  title,
  itemForm,
  setItemForm,
  categories,
  editingItem,
  editingItemLive,
  error,
  setError,
  saving,
  onClose,
  onSave,
  onDelete,
  onToggleAvailability,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  title: string;
  itemForm: MenuItemFormState;
  setItemForm: Dispatch<SetStateAction<MenuItemFormState>>;
  categories: MenuCategory[];
  editingItem: MenuItem | null;
  editingItemLive: MenuItem | null;
  error: string;
  setError: (msg: string) => void;
  saving: boolean;
  onClose: () => void;
  onSave: (e: FormEvent) => void;
  onDelete: () => void;
  onToggleAvailability: (item: MenuItem) => void;
}) {
  const formatMoney = useFormatMoney();
  const currency = useBusinessCurrency();
  const stepLabels = mode === 'edit' ? STEP_LABELS_EDIT : STEP_LABELS_CREATE;
  const lastStepIndex = stepLabels.length - 1;

  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open, editingItem?.id, mode]);

  const variantCount = editingItemLive?.variants?.length ?? 0;

  function validateStep(index: number): boolean {
    if (index === 0) {
      if (!itemForm.name.trim()) {
        setError('Enter an item name.');
        return false;
      }
      if (!itemForm.categoryId) {
        setError('Select a category.');
        return false;
      }
      return true;
    }
    if (index === 1) {
      if (itemForm.pricingType === 'fixed') {
        if (!itemForm.price.trim()) {
          setError('Enter the sale price.');
          return false;
        }
      } else if (!itemForm.pricePerUnit.trim()) {
        setError('Enter the price per unit.');
        return false;
      }
      return true;
    }
    return true;
  }

  function validateForSave(): boolean {
    for (let i = 0; i <= Math.min(2, lastStepIndex); i++) {
      if (!validateStep(i)) {
        setStep(i);
        return false;
      }
    }
    return true;
  }

  function goNext() {
    setError('');
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, lastStepIndex));
  }

  function goBack() {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validateForSave()) return;
    onSave(e);
  }

  const stepHint = useMemo(() => {
    switch (stepLabels[step]) {
      case 'Basics':
        return 'Photo, name, and where it appears on your menu.';
      case 'Pricing':
        return 'How customers are charged for this item.';
      case 'Details':
        return 'Optional description and availability.';
      case 'Sizes & add-ons':
        return 'Variants, modifiers, and extras for POS and QR ordering.';
      default:
        return '';
    }
  }, [step, stepLabels]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      width="md"
      footer={
        <>
          {mode === 'edit' && editingItem && step === 0 && (
            <Button variant="ghost" type="button" onClick={onDelete}>
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          {step > 0 && (
            <Button variant="ghost" type="button" onClick={goBack}>
              Back
            </Button>
          )}
          {step < lastStepIndex ? (
            <>
              {step >= 1 && (
                <Button variant="secondary" type="submit" form="item-form" loading={saving}>
                  {mode === 'create' ? 'Add item' : 'Save changes'}
                </Button>
              )}
              <Button variant="primary" type="button" onClick={goNext}>
                Next
              </Button>
            </>
          ) : (
            <Button variant="primary" type="submit" form="item-form" loading={saving}>
              {mode === 'create' ? 'Add item' : 'Save changes'}
            </Button>
          )}
        </>
      }
    >
      <StepIndicator labels={stepLabels} current={step} onGoTo={setStep} />
      <p className="font-caption text-on-surface-variant mb-5">{stepHint}</p>

      <form id="item-form" onSubmit={handleSubmit} className="space-y-5">
        {stepLabels[step] === 'Basics' && (
          <>
            <MenuItemImageField
              value={itemForm.imageUrl}
              onChange={(imageUrl) => setItemForm((f) => ({ ...f, imageUrl }))}
            />
            <Input
              label="Item name"
              value={itemForm.name}
              onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
            <SelectField
              label="Category"
              value={itemForm.categoryId}
              onChange={(e) => setItemForm((f) => ({ ...f, categoryId: e.target.value }))}
              options={[
                { value: '', label: 'Select category' },
                ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
              ]}
            />
          </>
        )}

        {stepLabels[step] === 'Pricing' && (
          <>
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
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label={`Sale price (${currency})`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="450"
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
                <Input
                  label="Price per unit"
                  type="number"
                  min={0}
                  step="0.01"
                  value={itemForm.pricePerUnit}
                  onChange={(e) => setItemForm((f) => ({ ...f, pricePerUnit: e.target.value }))}
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
                {itemForm.pricePerUnit.trim() && (
                  <p className="font-caption text-primary font-semibold">
                    Stored as{' '}
                    {formatMoney(
                      pricePerKgFromUnitPrice(Number(itemForm.pricePerUnit), itemForm.pricingUnitG),
                    )}{' '}
                    per kg
                  </p>
                )}
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

            {itemForm.pricingType === 'fixed' && variantCount === 0 && (() => {
              const profitInfo = formatItemProfit(itemForm.price, itemForm.basePrice);
              if (!profitInfo) return null;
              return (
                <p className="font-caption text-primary font-semibold rounded-lg bg-primary/5 px-3 py-2">
                  Estimated profit per item: {formatMoney(profitInfo.profit)} ({profitInfo.margin}%
                  margin)
                </p>
              );
            })()}
            {itemForm.pricingType === 'fixed' && variantCount > 0 && (
              <p className="font-caption text-on-surface-variant rounded-lg bg-surface-container-low px-3 py-2">
                This item has sizes/variants — set sale and base price on each variant in Sizes &
                add-ons.
              </p>
            )}
          </>
        )}

        {stepLabels[step] === 'Details' && (
          <>
            {mode === 'edit' && editingItem && (
              <div className="space-y-1.5">
                <label className="font-caption text-on-surface-variant font-bold block">
                  Availability
                </label>
                <button
                  type="button"
                  onClick={() => onToggleAvailability(editingItemLive ?? editingItem)}
                  className={`w-full h-11 px-4 rounded-lg border font-body-emphasis transition-colors ${
                    isMenuItemEditorAvailable(editingItemLive ?? editingItem)
                      ? 'border-primary/30 bg-primary/5 text-primary'
                      : 'border-outline-variant/30 text-on-surface-variant'
                  }`}
                >
                  {getMenuItemAvailabilityLabel(editingItemLive ?? editingItem)}
                </button>
              </div>
            )}
            <Textarea
              label="Description"
              rows={4}
              value={itemForm.description}
              onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description for staff and customers"
            />
          </>
        )}

        {stepLabels[step] === 'Sizes & add-ons' && mode === 'edit' && editingItemLive && (
          <MenuItemCustomizationPanel
            item={{
              ...editingItemLive,
              pricingType:
                itemForm.pricingType === 'by_weight' ? 'BY_WEIGHT' : editingItemLive.pricingType,
            }}
          />
        )}

        {error && <p className="font-caption text-error">{error}</p>}
      </form>
    </Drawer>
  );
}
