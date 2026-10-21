'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import {
  Button,
  Icon,
  Input,
  SelectField,
  StatusChip,
  DataTable,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableHeadCell,
  DataTableCell,
  DataTableLoading,
} from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import type { InventoryUnit } from '@/lib/api/types';
import {
  useAdjustInventoryStock,
  useCreateInventoryItem,
  useReceiveInventoryStock,
} from '@/lib/hooks/mutations';
import { useInventoryItems, useInventoryMovements } from '@/lib/hooks/queries';
import { SUPPLIER_EXPENSES_ENABLED } from '@/lib/feature-flags';
import { useToast } from '@/lib/toast';

const UNITS: InventoryUnit[] = ['KG', 'G', 'LITER', 'ML', 'PIECE', 'PACK', 'BOTTLE'];

function stockStatusVariant(status: string) {
  if (status === 'out_of_stock') return 'error' as const;
  if (status === 'low_stock') return 'neutral' as const;
  return 'success' as const;
}

function stockStatusLabel(status: string) {
  if (status === 'out_of_stock') return 'Out of stock (None left)';
  if (status === 'low_stock') return 'Low stock (Running low)';
  return 'In stock (Available)';
}

function stockStatusShort(status: string) {
  if (status === 'out_of_stock') return 'Out';
  if (status === 'low_stock') return 'Low';
  return 'OK';
}

export default function InventoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const { data: items = [], isLoading } = useInventoryItems();
  const createItem = useCreateInventoryItem();
  const receiveStock = useReceiveInventoryStock();
  const adjustStock = useAdjustInventoryStock();

  const [createOpen, setCreateOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    unit: 'PIECE' as InventoryUnit,
    currentQuantity: '',
    minThreshold: '',
  });
  const [stockForm, setStockForm] = useState({ quantity: '', note: '', mode: 'receive' as 'receive' | 'adjust' });
  const [error, setError] = useState('');

  const { data: movements = [] } = useInventoryMovements(selectedId ?? undefined);

  const selectedItem = items.find((i) => i.id === selectedId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createItem.mutateAsync({
        name: createForm.name.trim(),
        unit: createForm.unit,
        currentQuantity: createForm.currentQuantity ? Number(createForm.currentQuantity) : 0,
        minThreshold: createForm.minThreshold ? Number(createForm.minThreshold) : null,
      });
      toast.success('Inventory item created');
      setCreateForm({ name: '', unit: 'PIECE', currentQuantity: '', minThreshold: '' });
      setCreateOpen(false);
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  function handleStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError('');
    const qty = Number(stockForm.quantity);
    const note = stockForm.note.trim() || undefined;
    const onSuccess = () => {
      toast.success('Stock updated');
      setStockForm({ quantity: '', note: '', mode: 'receive' });
      setStockOpen(false);
    };
    const onError = (err: unknown) => setError(formatApiError(err));

    if (stockForm.mode === 'receive') {
      receiveStock.mutate({ id: selectedId, quantity: qty, note }, { onSuccess, onError });
    } else {
      adjustStock.mutate(
        { id: selectedId, quantityDelta: qty, note },
        { onSuccess, onError },
      );
    }
  }

  function openStock(itemId: string) {
    setSelectedId(itemId);
    setStockOpen(true);
  }

  function openHistory(itemId: string) {
    setSelectedId(itemId);
    setHistoryOpen(true);
  }

  return (
    <BusinessLayout slug={slug} hideFab>
      <div className="lg:hidden mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-primary to-[#3d8a7e] text-on-primary flex items-center justify-center shadow-md shadow-primary/20">
            <Icon name="inventory_2" className="text-lg" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-primary leading-tight">Inventory</h1>
            <p className="text-xs text-on-surface-variant">
              {items.length} item{items.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-2.5">
          {SUPPLIER_EXPENSES_ENABLED && (
            <Link href={`/${slug}/inventory/suppliers`} className="flex-1">
              <Button variant="outline" className="w-full !h-9 !text-xs">
                <Icon name="local_shipping" className="text-base" />
                Suppliers
              </Button>
            </Link>
          )}
          <Link href={`/${slug}/inventory/daily`} className="flex-1">
            <Button variant="outline" className="w-full !h-9 !text-xs">
              <Icon name="fact_check" className="text-base" />
              Daily
            </Button>
          </Link>
          <Button
            variant="secondary"
            className="flex-1 !h-9 !text-xs"
            onClick={() => setCreateOpen(true)}
          >
            <Icon name="add" className="text-base" />
            Add item
          </Button>
        </div>
      </div>

      <div className="hidden lg:block">
        <PageHeader
          icon="inventory_2"
          title="Inventory"
          description="Track ingredients, packaged goods, and stock movements."
          actions={
            <>
              {SUPPLIER_EXPENSES_ENABLED && (
                <Link href={`/${slug}/inventory/suppliers`}>
                  <Button variant="outline">
                    <Icon name="local_shipping" />
                    Suppliers
                  </Button>
                </Link>
              )}
              <Link href={`/${slug}/inventory/daily`}>
                <Button variant="outline">
                  <Icon name="fact_check" />
                  Daily inventory
                </Button>
              </Link>
              <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                <Icon name="add" />
                Add item
              </Button>
            </>
          }
        />
      </div>

      {!isLoading && items.length === 0 ? (
        <EmptyState
          icon="inventory_2"
          title="No inventory items"
          description="Create ingredients and packaged products to track stock and recipes."
          action={
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              Add item
            </Button>
          }
        />
      ) : (
        <>
          <div className="lg:hidden rounded-xl border border-outline-variant/15 bg-white overflow-hidden shadow-sm">
            {isLoading && (
              <div className="p-2 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-surface-container-low animate-pulse" />
                ))}
              </div>
            )}
            {!isLoading && (
              <div className="p-2 space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-body-emphasis text-sm text-primary truncate capitalize">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5 tabular-nums">
                          <span className="font-semibold text-on-surface">{item.currentQuantity}</span>
                          {' '}
                          {item.unit}
                          {item.minThreshold != null ? ` · min ${item.minThreshold}` : ''}
                        </p>
                      </div>
                      <StatusChip
                        label={stockStatusShort(item.stockStatus)}
                        variant={stockStatusVariant(item.stockStatus)}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        className="flex-1 !h-8 !text-xs"
                        onClick={() => openStock(item.id)}
                      >
                        Adjust
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1 !h-8 !text-xs"
                        onClick={() => openHistory(item.id)}
                      >
                        History
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <DataTable minWidth="720px">
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeadCell>Item</DataTableHeadCell>
                  <DataTableHeadCell>Stock</DataTableHeadCell>
                  <DataTableHeadCell>Unit</DataTableHeadCell>
                  <DataTableHeadCell>Min level</DataTableHeadCell>
                  <DataTableHeadCell>Status</DataTableHeadCell>
                  <DataTableHeadCell align="right">Actions</DataTableHeadCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {isLoading && <DataTableLoading rows={5} cols={6} />}
                {!isLoading &&
                  items.map((item) => (
                    <DataTableRow key={item.id}>
                      <DataTableCell className="font-body-emphasis">{item.name}</DataTableCell>
                      <DataTableCell>{item.currentQuantity}</DataTableCell>
                      <DataTableCell className="text-on-surface-variant">{item.unit}</DataTableCell>
                      <DataTableCell className="text-on-surface-variant">
                        {item.minThreshold ?? '—'}
                      </DataTableCell>
                      <DataTableCell>
                        <StatusChip
                          label={stockStatusLabel(item.stockStatus)}
                          variant={stockStatusVariant(item.stockStatus)}
                        />
                      </DataTableCell>
                      <DataTableCell align="right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            className="!px-3 !py-1.5 text-sm"
                            onClick={() => openStock(item.id)}
                          >
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            className="!px-3 !py-1.5 text-sm"
                            onClick={() => openHistory(item.id)}
                          >
                            History
                          </Button>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
              </DataTableBody>
            </DataTable>
          </div>
        </>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add inventory item (Add stock item)">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
          <SelectField
            label="Unit (Counted in)"
            value={createForm.unit}
            onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value as InventoryUnit })}
            options={UNITS.map((u) => ({ value: u, label: u }))}
          />
          <Input
            label="Initial quantity (How much do you have now?)"
            hint="Enter how many you have in store right now. You can change this later."
            type="number"
            min="0"
            value={createForm.currentQuantity}
            onChange={(e) => setCreateForm({ ...createForm, currentQuantity: e.target.value })}
          />
          <Input
            label="Low stock threshold (Warn when less than)"
            hint="We will show a warning when stock goes below this number. Leave empty if you don't need alerts."
            type="number"
            min="0"
            value={createForm.minThreshold}
            onChange={(e) => setCreateForm({ ...createForm, minThreshold: e.target.value })}
          />
          {error && <p className="text-error text-sm">{error}</p>}
          <Button type="submit" loading={createItem.isPending}>Create</Button>
        </form>
      </Modal>

      <Modal
        open={stockOpen}
        onClose={() => setStockOpen(false)}
        title={`Adjust stock (Change stock) — ${selectedItem?.name ?? ''}`}
      >
        <form onSubmit={handleStock} className="space-y-4">
          <SelectField
            label="Action (What do you want to do?)"
            value={stockForm.mode}
            onChange={(e) => setStockForm({ ...stockForm, mode: e.target.value as 'receive' | 'adjust' })}
            options={[
              { value: 'receive', label: 'Receive stock (+) (New stock came in)' },
              { value: 'adjust', label: 'Manual adjustment (+/-) (Fix or correct the count)' },
            ]}
          />
          <Input
            label={
              stockForm.mode === 'receive'
                ? 'Quantity to add (How much to add)'
                : 'Quantity delta (Add or remove — use minus to remove)'
            }
            type="number"
            value={stockForm.quantity}
            onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
            required
          />
          <Input label="Note (optional)" value={stockForm.note} onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })} />
          {error && <p className="text-error text-sm">{error}</p>}
          <Button type="submit" loading={receiveStock.isPending || adjustStock.isPending}>Save</Button>
        </form>
      </Modal>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Movement history (Stock history) — ${selectedItem?.name ?? ''}`}
      >
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {movements.length === 0 && (
            <p className="font-caption text-on-surface-variant">No movements yet (No changes yet).</p>
          )}
          {movements.map((m) => (
            <div key={m.id} className="flex justify-between gap-4 py-2 border-b border-outline-variant/10 text-sm">
              <span>{m.type}</span>
              <span>{m.quantityDelta}</span>
              <span className="text-on-surface-variant">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Modal>
    </BusinessLayout>
  );
}
