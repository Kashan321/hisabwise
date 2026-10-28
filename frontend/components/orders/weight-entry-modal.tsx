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
}: {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
  onConfirm: (weightG: number) => void;
  initialWeightG?: number | null;
  confirmLabel?: string;
  themeStyle?: CSSProperties;
}) {
  const formatMoney = useFormatMoney();
  const [unitMode, setUnitMode] = useState<UnitMode>('g');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const pricePerKg = Number(item.pricePerKg ?? item.price);
  const rounding = (item.priceRounding ?? null) as 1 | 5 | 10 | null;
  const quickButtons =
    item.quickWeightsG?.length
      ? item.quickWeightsG
      : [250, 500, 750, 1000];

  useEffect(() => {
    if (!open) return;
    setError('');
    setUnitMode('g');
    if (initialWeightG != null) {
      setInput(String(initialWeightG));
    } else {
      setInput('');
    }
  }, [open, item.id, initialWeightG]);

  const weightG = useMemo(() => parseInputToGrams(input, unitMode), [input, unitMode]);

  const liveBase =
    weightG != null && menuItemIsByWeight(item)
      ? computeWeightLineBase(pricePerKg, weightG, rounding)
      : null;

  function validate(): number | null {
    const grams = parseInputToGrams(input, unitMode);
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
    setError('');
  }

  if (!menuItemIsByWeight(item)) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      themeStyle={themeStyle}
      title={item.name}
      description={`Sell by weight · ${formatMoney(pricePerKg)} per kg`}
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
              <p className="text-sm text-on-surface-variant">Enter weight to see price</p>
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
        <div className="flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded-xl border py-3 text-lg font-bold ${
              unitMode === 'g' ? 'border-primary bg-primary-container/30' : 'border-outline-variant/30'
            }`}
            onClick={() => setUnitMode('g')}
          >
            Grams (g)
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl border py-3 text-lg font-bold ${
              unitMode === 'kg' ? 'border-primary bg-primary-container/30' : 'border-outline-variant/30'
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
            setError('');
          }}
          aria-label="Weight"
        />
        {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          {quickButtons.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => applyQuick(g)}
              className="rounded-xl border border-outline-variant/25 bg-surface-container-low px-4 py-3 text-base font-bold"
            >
              {formatWeightDisplay(g)}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
