'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Button, Input } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import type { MenuItem } from '@/lib/api/types';
import {
  computeWeightLineBase,
  formatWeightDisplay,
  validateWeightInput,
} from '@/lib/pricing/weight-line-pricing';
import { menuItemIsByWeight } from '@/lib/order-item-display';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';

type UnitMode = 'g' | 'kg';

function parseInputToGrams(raw: string, mode: UnitMode): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.round(mode === 'kg' ? n * 1000 : n);
}

export function WeightEntryModal({
  item,
  open,
  onClose,
  onConfirm,
  initialWeightG,
  confirmLabel = 'Add to order',
  themeStyle,
  quickWeightsOnly = false,
  formatMoney: formatMoneyProp,
}: {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
  onConfirm: (weightG: number) => void;
  initialWeightG?: number | null;
  confirmLabel?: string;
  themeStyle?: CSSProperties;
  /** QR ordering: pick from preset weights only (no manual entry). */
  quickWeightsOnly?: boolean;
  formatMoney?: (amount: number | string | null | undefined) => string;
}) {
  const formatMoneyHook = useFormatMoney();
  const formatMoney = formatMoneyProp ?? formatMoneyHook;
  const [unitMode, setUnitMode] = useState<UnitMode>('g');
  const [input, setInput] = useState('');
  const [selectedQuickG, setSelectedQuickG] = useState<number | null>(null);
  const [error, setError] = useState('');

  const pricePerKg = Number(item.pricePerKg ?? item.price);
  const rounding = (item.priceRounding ?? null) as 1 | 5 | 10 | null;
  const quickButtons = useMemo(() => {
    const base =
      item.quickWeightsG?.length ? item.quickWeightsG : [250, 500, 750, 1000];
    const min = item.minWeightG ?? 0;
    return base.filter((g) => g >= min);
  }, [item.quickWeightsG, item.minWeightG]);

  useEffect(() => {
    if (!open) return;
    setError('');
    setUnitMode('g');
    setSelectedQuickG(initialWeightG ?? null);
    if (initialWeightG != null) {
      setInput(String(initialWeightG));
    } else {
      setInput('');
    }
  }, [open, item.id, initialWeightG]);

  const weightG = useMemo(() => {
    if (quickWeightsOnly) return selectedQuickG;
    return parseInputToGrams(input, unitMode);
  }, [quickWeightsOnly, selectedQuickG, input, unitMode]);

  const liveBase =
    weightG != null && menuItemIsByWeight(item)
      ? computeWeightLineBase(pricePerKg, weightG, rounding)
      : null;

  function validate(): number | null {
    const grams = quickWeightsOnly ? selectedQuickG : parseInputToGrams(input, unitMode);
    const result = validateWeightInput(grams, { minWeightG: item.minWeightG });
    if (!result.ok) {
      setError(result.message);
      return null;
    }
    setError('');
    return result.weightG;
  }

  function handleConfirm() {
    const grams = validate();
    if (grams == null) return;
    onConfirm(grams);
    onClose();
  }

  function applyQuick(g: number) {
    setUnitMode('g');
    setInput(String(g));
    setSelectedQuickG(g);
    setError('');
  }

  if (!menuItemIsByWeight(item)) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      themeStyle={themeStyle}
      title={item.name}
      description={
        quickWeightsOnly
          ? `Choose a portion · ${formatMoney(pricePerKg)} per kg`
          : `Sell by weight · ${formatMoney(pricePerKg)} per kg`
      }
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            {liveBase != null && weightG != null ? (
              <>
                <p className="font-caption text-on-surface-variant">Price</p>
                <p className="font-title-lg text-primary">
                  {formatWeightDisplay(weightG)} = {formatMoney(liveBase)}
                </p>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">
                {quickWeightsOnly ? 'Tap a weight below' : 'Enter weight to see price'}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {quickWeightsOnly ? (
          <p className="text-sm text-on-surface-variant">
            Need a different amount? Ask staff at the counter.
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-xl border py-3 text-lg font-bold ${
                  unitMode === 'g'
                    ? 'border-primary bg-primary-container/30'
                    : 'border-outline-variant/30'
                }`}
                onClick={() => setUnitMode('g')}
              >
                Grams (g)
              </button>
              <button
                type="button"
                className={`flex-1 rounded-xl border py-3 text-lg font-bold ${
                  unitMode === 'kg'
                    ? 'border-primary bg-primary-container/30'
                    : 'border-outline-variant/30'
                }`}
                onClick={() => setUnitMode('kg')}
              >
                Kilograms (kg)
              </button>
            </div>

            <Input
              inputMode="decimal"
              className="!text-3xl !py-4 !text-center font-mono font-bold"
              placeholder={unitMode === 'g' ? '350' : '1.25'}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSelectedQuickG(null);
                setError('');
              }}
              aria-label="Weight"
            />
          </>
        )}
        {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          {quickButtons.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => applyQuick(g)}
              className={`rounded-xl border px-4 py-3 text-base font-bold min-w-[5.5rem] ${
                selectedQuickG === g || (!quickWeightsOnly && input === String(g))
                  ? 'border-primary bg-primary-container/40 text-primary'
                  : 'border-outline-variant/25 bg-surface-container-low'
              }`}
            >
              {formatWeightDisplay(g)}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
