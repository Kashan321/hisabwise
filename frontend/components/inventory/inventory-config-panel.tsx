'use client';

import { useEffect, useState } from 'react';
import { Button, Icon, Input, SelectField } from '@/components/ui';
import { formatApiError } from '@/lib/api/errors';
import type { InventoryTrackingMode, InventoryUnit } from '@/lib/api/types';
import {
  useUpdateMenuItemInventory,
  useUpdateModifierInventory,
  useUpdateVariantInventory,
} from '@/lib/hooks/mutations';
import { useInventoryItems } from '@/lib/hooks/queries';
import { apiFetch } from '@/lib/api/client';
import { useToast } from '@/lib/toast';

const UNITS: InventoryUnit[] = ['KG', 'G', 'LITER', 'ML', 'PIECE', 'PACK', 'BOTTLE'];
const TRACKING_OPTIONS: { value: InventoryTrackingMode; label: string }[] = [
  { value: 'NONE', label: "None (Don't track stock)" },
  { value: 'SIMPLE_STOCK', label: 'Simple stock (One sale = one item, e.g. 1 bottle)' },
  { value: 'RECIPE', label: 'Recipe (Uses ingredients, e.g. flour, cheese)' },
];

type TargetType = 'item' | 'variant' | 'modifier';

interface RecipeLineDraft {
  inventoryItemId: string;
  quantity: string;
  unit: InventoryUnit;
}

export function InventoryConfigPanel({
  targetType,
  targetId,
  disabledSimpleStock,
  title,
}: {
  targetType: TargetType;
  targetId: string;
  disabledSimpleStock?: boolean;
  title?: string;
}) {
  const toast = useToast();
  const { data: inventoryItems = [] } = useInventoryItems();
  const updateItem = useUpdateMenuItemInventory();
  const updateVariant = useUpdateVariantInventory();
  const updateModifier = useUpdateModifierInventory();

  const [trackingMode, setTrackingMode] = useState<InventoryTrackingMode>('NONE');
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [recipeLines, setRecipeLines] = useState<RecipeLineDraft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const path =
          targetType === 'item'
            ? `/menu/items/${targetId}/inventory`
            : targetType === 'variant'
              ? `/menu/variants/${targetId}/inventory`
              : `/menu/modifier-options/${targetId}/inventory`;
        const data = await apiFetch<{
          inventory: {
            trackingMode: InventoryTrackingMode;
            inventoryItemId: string | null;
            recipeLines: Array<{ inventoryItemId: string; quantity: string; unit: InventoryUnit }>;
          };
        }>(path);
        if (cancelled) return;
        setTrackingMode(data.inventory.trackingMode);
        setInventoryItemId(data.inventory.inventoryItemId ?? '');
        setRecipeLines(
          data.inventory.recipeLines.map((l) => ({
            inventoryItemId: l.inventoryItemId,
            quantity: l.quantity,
            unit: l.unit,
          })),
        );
      } catch {
        if (!cancelled) {
          setTrackingMode('NONE');
          setInventoryItemId('');
          setRecipeLines([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  async function handleSave() {
    try {
      const body = {
        trackingMode,
        inventoryItemId: trackingMode === 'SIMPLE_STOCK' ? inventoryItemId : null,
        recipeLines:
          trackingMode === 'RECIPE'
            ? recipeLines
                .filter((l) => l.inventoryItemId && l.quantity)
                .map((l) => ({
                  inventoryItemId: l.inventoryItemId,
                  quantity: Number(l.quantity),
                  unit: l.unit,
                }))
            : undefined,
      };

      if (targetType === 'item') {
        await updateItem.mutateAsync({ itemId: targetId, ...body });
      } else if (targetType === 'variant') {
        await updateVariant.mutateAsync({ variantId: targetId, ...body });
      } else {
        await updateModifier.mutateAsync({ optionId: targetId, ...body });
      }
      toast.success('Inventory configuration saved');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  function addRecipeLine() {
    setRecipeLines((prev) => [
      ...prev,
      { inventoryItemId: inventoryItems[0]?.id ?? '', quantity: '1', unit: 'G' },
    ]);
  }

  if (loading) return <p className="font-caption text-on-surface-variant">Loading inventory config… (Loading stock settings…)</p>;

  const trackingOptions = disabledSimpleStock
    ? TRACKING_OPTIONS.filter((o) => o.value !== 'SIMPLE_STOCK')
    : TRACKING_OPTIONS;

  return (
    <div className="rounded-xl border border-outline-variant/20 p-4 space-y-4 bg-surface-container-low/40">
      <div className="flex items-center gap-2">
        <Icon name="inventory_2" className="text-primary" />
        <h4 className="font-body-emphasis">{title ?? 'Inventory tracking (Link to stock)'}</h4>
      </div>

      <SelectField
        label="Tracking mode (How to count stock)"
        value={trackingMode}
        onChange={(e) => setTrackingMode(e.target.value as InventoryTrackingMode)}
        options={trackingOptions.map((o) => ({ value: o.value, label: o.label }))}
      />

      {trackingMode === 'SIMPLE_STOCK' && (
        <SelectField
          label="Inventory item (Which stock item)"
          value={inventoryItemId}
          onChange={(e) => setInventoryItemId(e.target.value)}
          options={inventoryItems.map((i) => ({ value: i.id, label: i.name }))}
        />
      )}

      {trackingMode === 'RECIPE' && (
        <div className="space-y-3">
          {recipeLines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              <SelectField
                label="Ingredient (What is used)"
                value={line.inventoryItemId}
                onChange={(e) =>
                  setRecipeLines((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, inventoryItemId: e.target.value } : l)),
                  )
                }
                options={inventoryItems.map((i) => ({ value: i.id, label: i.name }))}
              />
              <Input
                label="Qty (How much used)"
                type="number"
                min="0"
                value={line.quantity}
                onChange={(e) =>
                  setRecipeLines((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)),
                  )
                }
              />
              <SelectField
                label="Unit (Counted in)"
                value={line.unit}
                onChange={(e) =>
                  setRecipeLines((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, unit: e.target.value as InventoryUnit } : l)),
                  )
                }
                options={UNITS.map((u) => ({ value: u, label: u }))}
              />
              <Button
                variant="ghost"
                className="!px-3 !py-1.5 text-sm"
                onClick={() => setRecipeLines((prev) => prev.filter((_, i) => i !== idx))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button variant="ghost" className="!px-3 !py-1.5 text-sm" onClick={addRecipeLine}>
            <Icon name="add" />
            Add ingredient
          </Button>
        </div>
      )}

      <Button
        variant="secondary"
        className="!px-3 !py-1.5 text-sm"
        onClick={handleSave}
        loading={updateItem.isPending || updateVariant.isPending || updateModifier.isPending}
      >
        Save inventory config (Save stock settings)
      </Button>
    </div>
  );
}
