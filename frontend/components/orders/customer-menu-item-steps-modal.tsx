'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Button, Input } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import type { MenuItem, ModifierGroup, InventoryAvailabilityMap } from '@/lib/api/types';
import {
  CartLineSelection,
  groupSelectionHint,
  isCustomizationValid,
  isSellableInventoryOk,
  lineUnitPrice,
} from '@/lib/cart-line';
import {
  buildMenuItemCustomizeSteps,
  menuItemCustomizeStepLabel,
  modifierGroupStepValid,
  type MenuItemCustomizeStep,
} from '@/lib/menu-item-customize-steps';
import { menuItemIsByWeight } from '@/lib/order-item-display';
import {
  computeWeightLineBase,
  formatWeightDisplay,
  validateWeightInput,
} from '@/lib/pricing/weight-line-pricing';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';

type UnitMode = 'g' | 'kg';

function parseInputToGrams(raw: string, mode: UnitMode): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.round(mode === 'kg' ? n * 1000 : n);
}

function OptionPill({
  active,
  onClick,
  label,
  priceHint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  priceHint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-4 py-3 flex items-center justify-between gap-3 font-body-emphasis transition-colors text-left ${
        active
          ? 'bg-primary text-on-primary shadow-sm'
          : 'bg-surface-container-high text-on-surface hover:bg-surface-container'
      }`}
    >
      <span>{label}</span>
      {priceHint ? (
        <span className={`font-caption tabular-nums ${active ? 'text-on-primary/90' : 'text-on-surface-variant'}`}>
          {priceHint}
        </span>
      ) : null}
    </button>
  );
}

export function CustomerMenuItemStepsModal({
  item,
  open,
  onClose,
  onConfirm,
  initialSelection,
  confirmLabel = 'Add to order',
  inventoryAvailability,
  themeStyle,
  quickWeightsOnly = true,
  formatMoney: formatMoneyProp,
}: {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
  onConfirm: (selection: CartLineSelection) => void;
  initialSelection?: CartLineSelection;
  confirmLabel?: string;
  inventoryAvailability?: InventoryAvailabilityMap;
  themeStyle?: CSSProperties;
  quickWeightsOnly?: boolean;
  formatMoney?: (amount: number | string | null | undefined) => string;
}) {
  const formatMoneyHook = useFormatMoney();
  const formatMoney = formatMoneyProp ?? formatMoneyHook;

  const steps = useMemo(() => buildMenuItemCustomizeSteps(item), [item]);
  const [stepIndex, setStepIndex] = useState(0);

  const [weightG, setWeightG] = useState<number | null>(null);
  const [unitMode, setUnitMode] = useState<UnitMode>('g');
  const [weightInput, setWeightInput] = useState('');
  const [weightError, setWeightError] = useState('');

  const [variantId, setVariantId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const pricePerKg = Number(item.pricePerKg ?? item.price);
  const rounding = (item.priceRounding ?? null) as 1 | 5 | 10 | null;

  const quickButtons = useMemo(() => {
    const base = item.quickWeightsG?.length ? item.quickWeightsG : [250, 500, 750, 1000];
    const min = item.minWeightG ?? 0;
    return base.filter((g) => g >= min);
  }, [item.quickWeightsG, item.minWeightG]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setWeightError('');
    setUnitMode('g');
    const initialWeight = initialSelection?.weightG ?? null;
    setWeightG(initialWeight);
    setWeightInput(initialWeight != null ? String(initialWeight) : '');
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

  const currentStep: MenuItemCustomizeStep | undefined = steps[stepIndex];
  const isLastStep = stepIndex >= steps.length - 1;

  const modifierOptionIds = useMemo(() => Object.values(selected).flat(), [selected]);
  const selection: CartLineSelection = {
    variantId: menuItemIsByWeight(item) ? null : variantId,
    weightG,
    modifierOptionIds,
  };

  const totalPrice = lineUnitPrice(
    item,
    modifierOptionIds,
    selection.variantId,
    selection.weightG,
  );

  const availableVariants = menuItemIsByWeight(item)
    ? []
    : (item.variants ?? []).filter(
        (variant) =>
          variant.isAvailable &&
          isSellableInventoryOk(inventoryAvailability, item.id, variant.id, []),
      );

  function resolvedWeightG(): number | null {
    if (!menuItemIsByWeight(item)) return null;
    if (quickWeightsOnly) return weightG;
    return parseInputToGrams(weightInput, unitMode);
  }

  function currentStepValid(): boolean {
    if (!currentStep) return false;
    if (currentStep.kind === 'weight') {
      const grams = resolvedWeightG();
      return validateWeightInput(grams, { minWeightG: item.minWeightG }).ok;
    }
    if (currentStep.kind === 'variant') {
      return variantId != null;
    }
    const picks = selected[currentStep.group.id] ?? [];
    return modifierGroupStepValid(currentStep.group, picks);
  }

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

  function applyQuickWeight(g: number) {
    setUnitMode('g');
    setWeightInput(String(g));
    setWeightG(g);
    setWeightError('');
  }

  function goNext() {
    if (currentStep?.kind === 'weight') {
      const grams = resolvedWeightG();
      const result = validateWeightInput(grams, { minWeightG: item.minWeightG });
      if (!result.ok) {
        setWeightError(result.message);
        return;
      }
      setWeightG(result.weightG);
      setWeightError('');
    }
    if (isLastStep) {
      if (!isCustomizationValid(item, { ...selection, weightG: resolvedWeightG() ?? weightG })) return;
      onConfirm({
        variantId: selection.variantId,
        weightG: resolvedWeightG() ?? weightG,
        modifierOptionIds,
      });
      onClose();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setWeightError('');
    setStepIndex((i) => Math.max(0, i - 1));
  }

  const liveWeightG = resolvedWeightG();
  const liveBase =
    liveWeightG != null && menuItemIsByWeight(item)
      ? computeWeightLineBase(pricePerKg, liveWeightG, rounding)
      : null;

  const stepDescription =
    steps.length > 0 && currentStep
      ? `Step ${stepIndex + 1} of ${steps.length} · ${menuItemCustomizeStepLabel(currentStep)}`
      : undefined;

  const modifierHint =
    currentStep?.kind === 'modifiers' ? groupSelectionHint(currentStep.group) : null;

  if (!steps.length) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      themeStyle={themeStyle}
      size="md"
      title={item.name}
      description={stepDescription}
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left min-h-[2.75rem] flex flex-col justify-center">
            <p className="font-caption text-on-surface-variant">Total</p>
            <p className="font-mono text-xl font-bold text-primary tabular-nums">{formatMoney(totalPrice)}</p>
          </div>
          <div className="flex gap-2 justify-end">
            {stepIndex > 0 ? (
              <Button type="button" variant="ghost" onClick={goBack}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="button" variant="primary" disabled={!currentStepValid()} onClick={goNext}>
              {isLastStep ? confirmLabel : 'Next'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 min-h-[8rem]">
        {currentStep?.kind === 'weight' && (
          <>
            <p className="text-center font-caption text-on-surface-variant">
              {formatMoney(pricePerKg)} per kg
              {quickWeightsOnly ? ' · Tap a portion' : ''}
            </p>
            {liveBase != null && liveWeightG != null ? (
              <p className="text-center font-mono text-2xl font-bold text-primary tabular-nums">
                {formatWeightDisplay(liveWeightG)} = {formatMoney(liveBase)}
              </p>
            ) : null}
            {!quickWeightsOnly && (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 rounded-full py-2.5 font-body-emphasis ${
                      unitMode === 'g'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface'
                    }`}
                    onClick={() => setUnitMode('g')}
                  >
                    Grams (g)
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-full py-2.5 font-body-emphasis ${
                      unitMode === 'kg'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface'
                    }`}
                    onClick={() => setUnitMode('kg')}
                  >
                    Kilograms (kg)
                  </button>
                </div>
                <Input
                  inputMode="decimal"
                  className="!text-2xl !py-3 !text-center font-mono font-bold"
                  placeholder={unitMode === 'g' ? '350' : '1.25'}
                  value={weightInput}
                  onChange={(e) => {
                    setWeightInput(e.target.value);
                    setWeightG(null);
                    setWeightError('');
                  }}
                  aria-label="Weight"
                />
              </>
            )}
            {quickWeightsOnly ? (
              <p className="text-sm text-on-surface-variant text-center">
                Need a different amount? Ask staff at the counter.
              </p>
            ) : null}
            {weightError ? <p className="text-sm text-error font-medium text-center">{weightError}</p> : null}
            <div className="flex flex-wrap justify-center gap-2">
              {quickButtons.map((g) => {
                const active =
                  weightG === g || (!quickWeightsOnly && weightInput === String(g));
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => applyQuickWeight(g)}
                    className={`rounded-full px-5 py-2.5 font-body-emphasis min-w-[5.5rem] transition-colors ${
                      active
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {formatWeightDisplay(g)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {currentStep?.kind === 'variant' && (
          <div className="space-y-2">
            <p className="font-caption text-on-surface-variant text-center">Required · choose one</p>
            {availableVariants.map((variant) => (
              <OptionPill
                key={variant.id}
                active={variantId === variant.id}
                onClick={() => setVariantId(variant.id)}
                label={variant.name}
                priceHint={formatMoney(variant.price)}
              />
            ))}
          </div>
        )}

        {currentStep?.kind === 'modifiers' && (
          <div className="space-y-2">
            {modifierHint ? (
              <p className="font-caption text-on-surface-variant text-center">{modifierHint}</p>
            ) : null}
            {currentStep.group.options
              .filter(
                (option) =>
                  option.isAvailable &&
                  isSellableInventoryOk(inventoryAvailability, item.id, variantId, [option.id]),
              )
              .map((option) => {
                const checked = (selected[currentStep.group.id] ?? []).includes(option.id);
                const priceAdj = Number(option.priceAdjustment);
                return (
                  <OptionPill
                    key={option.id}
                    active={checked}
                    onClick={() => toggleOption(currentStep.group, option.id)}
                    label={option.name}
                    priceHint={priceAdj !== 0 ? `+${formatMoney(priceAdj)}` : undefined}
                  />
                );
              })}
          </div>
        )}
      </div>
    </Modal>
  );
}
