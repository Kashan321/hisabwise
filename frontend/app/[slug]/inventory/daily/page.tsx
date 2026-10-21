'use client';

import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import { InventoryDailyCloseSummary } from '@/components/inventory/inventory-daily-close-summary';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Button, Icon, Input, SelectField, Textarea } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { DataPanel, EmptyState, MetricPill, PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import type {
  InventoryDailyItemSummary,
  InventoryDailySessionSummary,
  InventoryWastageReason,
} from '@/lib/api/types';
import { printInventoryDailyCloseReport } from '@/lib/print-inventory-daily-close-report';
import {
  useCloseInventoryDailySession,
  useOpenInventoryDailySession,
  useRecordInventoryDailyAdjustment,
  useRecordInventoryPurchase,
  useRecordInventoryWastage,
} from '@/lib/hooks/mutations';
import {
  useCurrentInventoryDailySession,
  useInventoryDailyDashboard,
  useInventoryDailyMovements,
  useBusiness,
  useInventoryItems,
  useReceiptTemplate,
} from '@/lib/hooks/queries';
import { SUPPLIER_EXPENSES_ENABLED } from '@/lib/feature-flags';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { useToast } from '@/lib/toast';

const WASTAGE_REASONS: { value: InventoryWastageReason; label: string }[] = [
  { value: 'SPOILED', label: 'Spoiled' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'PREPARATION_WASTE', label: 'Preparation waste' },
  { value: 'OTHER', label: 'Other' },
];

function movementTypeLabel(type: string) {
  switch (type) {
    case 'RECEIPT':
      return 'Purchase';
    case 'SALE':
      return 'Sale consumption';
    case 'SALE_REVERSAL':
      return 'Sale reversal';
    case 'WASTE':
      return 'Wastage';
    case 'ADJUSTMENT':
      return 'Adjustment';
    default:
      return type;
  }
}

function formatQty(value: string, unit: string) {
  const n = Number(value);
  if (Number.isNaN(n)) return `${value} ${unit}`;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} ${unit}`;
}

export default function DailyInventoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { data: business } = useBusiness();
  const { data: receiptTemplate } = useReceiptTemplate();

  const { data: session, isLoading: sessionLoading, isError: sessionError } = useCurrentInventoryDailySession();
  const { data: dashboard, isLoading: dashboardLoading, isError: dashboardError } = useInventoryDailyDashboard();
  const { data: items = [] } = useInventoryItems();
  const { data: movements = [] } = useInventoryDailyMovements(session?.id);

  const openSession = useOpenInventoryDailySession();
  const closeSession = useCloseInventoryDailySession();
  const recordPurchase = useRecordInventoryPurchase();
  const recordWastage = useRecordInventoryWastage();
  const recordAdjustment = useRecordInventoryDailyAdjustment();

  const [shiftName, setShiftName] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [error, setError] = useState('');

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [wastageOpen, setWastageOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReportOpen, setCloseReportOpen] = useState(false);
  const [closedReport, setClosedReport] = useState<InventoryDailySessionSummary | null>(null);
  const [closingNotes, setClosingNotes] = useState('');

  const [purchaseForm, setPurchaseForm] = useState({
    inventoryItemId: '',
    quantity: '',
    unitCost: '',
    supplierId: '',
    supplier: '',
    invoiceRef: '',
    notes: '',
  });
  const [wastageForm, setWastageForm] = useState({
    inventoryItemId: '',
    quantity: '',
    reason: 'SPOILED' as InventoryWastageReason,
    notes: '',
  });
  const [adjustForm, setAdjustForm] = useState({
    inventoryItemId: '',
    quantityDelta: '',
    note: '',
  });
  const [actualCounts, setActualCounts] = useState<Record<string, string>>({});

  const summaryItems = dashboard?.items ?? [];
  const purchases = dashboard?.purchases ?? [];
  const totals = dashboard?.totals;
  const alerts = dashboard?.alerts;

  const itemOptions = useMemo(
    () => items.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })),
    [items],
  );

  async function handleOpenSession(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await openSession.mutateAsync({
        shiftName: shiftName.trim() || undefined,
        openingNotes: openingNotes.trim() || undefined,
      });
      toast.success('Daily inventory session opened');
      setShiftName('');
      setOpeningNotes('');
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError('');
    try {
      await recordPurchase.mutateAsync({
        sessionId: session.id,
        inventoryItemId: purchaseForm.inventoryItemId,
        quantity: Number(purchaseForm.quantity),
        unitCost: purchaseForm.unitCost ? Number(purchaseForm.unitCost) : undefined,
        ...(SUPPLIER_EXPENSES_ENABLED && purchaseForm.supplierId
          ? { supplierId: purchaseForm.supplierId }
          : {}),
        supplier: purchaseForm.supplier.trim() || undefined,
        invoiceRef: purchaseForm.invoiceRef.trim() || undefined,
        notes: purchaseForm.notes.trim() || undefined,
      });
      toast.success('Purchase recorded');
      setPurchaseOpen(false);
      setPurchaseForm({
        inventoryItemId: '',
        quantity: '',
        unitCost: '',
        supplierId: '',
        supplier: '',
        invoiceRef: '',
        notes: '',
      });
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function handleWastage(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError('');
    try {
      await recordWastage.mutateAsync({
        sessionId: session.id,
        inventoryItemId: wastageForm.inventoryItemId,
        quantity: Number(wastageForm.quantity),
        reason: wastageForm.reason,
        notes: wastageForm.notes.trim() || undefined,
      });
      toast.success('Wastage recorded');
      setWastageOpen(false);
      setWastageForm({ inventoryItemId: '', quantity: '', reason: 'SPOILED', notes: '' });
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function handleAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError('');
    try {
      await recordAdjustment.mutateAsync({
        sessionId: session.id,
        inventoryItemId: adjustForm.inventoryItemId,
        quantityDelta: Number(adjustForm.quantityDelta),
        note: adjustForm.note.trim() || undefined,
      });
      toast.success('Adjustment recorded');
      setAdjustOpen(false);
      setAdjustForm({ inventoryItemId: '', quantityDelta: '', note: '' });
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  function openCloseModal() {
    const counts: Record<string, string> = {};
    for (const item of summaryItems) {
      counts[item.inventoryItemId] =
        actualCounts[item.inventoryItemId] ?? item.expectedClosing ?? item.currentStock;
    }
    setActualCounts(counts);
    setCloseOpen(true);
  }

  function handlePrintCloseReport(summary: InventoryDailySessionSummary) {
    printInventoryDailyCloseReport({
      summary,
      businessName: business?.name,
      businessLocation: business?.location,
      formatMoney,
      widthMm: receiptTemplate?.receiptWidthMm ?? 80,
    });
  }

  async function handleCloseSession(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setError('');
    try {
      const lines = summaryItems.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        actualClosingQuantity: Number(
          actualCounts[item.inventoryItemId] ?? item.expectedClosing,
        ),
      }));
      const result = await closeSession.mutateAsync({
        sessionId: session.id,
        lines,
        closingNotes: closingNotes.trim() || undefined,
      });
      toast.success('Daily inventory session closed');
      setCloseOpen(false);
      setClosingNotes('');
      setClosedReport(result.summary);
      setCloseReportOpen(true);
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  const isLoading = sessionLoading || dashboardLoading;
  const isOpen = session?.status === 'OPEN';
  const showOpenForm = !isLoading && !session && (!dashboard || dashboard.mode === 'none');
  const apiUnavailable = sessionError || dashboardError;

  return (
    <BusinessLayout slug={slug}>
      <PageHeader
        icon="fact_check"
        title="Daily inventory"
        description="Track opening stock, purchases, sales consumption, wastage, and shift closing."
        actions={
          <div className="flex flex-wrap gap-2">
            {SUPPLIER_EXPENSES_ENABLED && (
              <Link href={`/${slug}/inventory/suppliers`}>
                <Button variant="outline">
                  <Icon name="local_shipping" />
                  Supplier expenses
                </Button>
              </Link>
            )}
            <Link href={`/${slug}/inventory`}>
              <Button variant="outline">
                <Icon name="inventory_2" />
                Stock items
              </Button>
            </Link>
          </div>
        }
      />

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface-container-low animate-pulse" />
          ))}
        </div>
      )}

      {apiUnavailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4 text-sm text-amber-900">
          Could not load daily inventory data. Make sure the backend migration has been run:{' '}
          <code className="text-xs bg-white/60 px-1 rounded">npx prisma migrate deploy</code>
        </div>
      )}

      {showOpenForm && (
        <div className="rounded-2xl border-2 border-outline-variant/10 bg-white p-6 shadow-sm max-w-xl">
          <h3 className="font-title-lg text-primary mb-2">Start today&apos;s inventory</h3>
          <p className="text-sm text-on-surface-variant mb-4">
            Open a session to snapshot opening stock. Purchases, sales consumption, and wastage will
            be tracked until you close the shift.
          </p>
          <form onSubmit={handleOpenSession} className="space-y-4">
            <Input
              label="Shift name (optional)"
              placeholder="e.g. Morning, Evening"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
            />
            <Textarea
              label="Opening notes"
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              rows={2}
            />
            {error && <p className="font-caption text-error">{error}</p>}
            <Button type="submit" variant="primary" loading={openSession.isPending}>
              Open daily session
            </Button>
          </form>
        </div>
      )}

      {!isLoading && session && totals && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                isOpen ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {isOpen ? 'Session open' : 'Session closed'}
            </span>
            <span className="text-sm text-on-surface-variant">
              {session.sessionDate}
              {session.shiftName ? ` · ${session.shiftName}` : ''}
              {' · '}Opened by {session.openedByName}
            </span>
            {isOpen && (
              <div className="flex flex-wrap gap-2 ml-auto">
                <Button variant="secondary" onClick={() => setPurchaseOpen(true)}>
                  <Icon name="add_shopping_cart" />
                  Record purchase
                </Button>
                <Button variant="secondary" onClick={() => setWastageOpen(true)}>
                  <Icon name="delete" />
                  Record wastage
                </Button>
                <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                  <Icon name="tune" />
                  Adjustment
                </Button>
                <Button variant="primary" onClick={openCloseModal}>
                  <Icon name="lock" />
                  Close shift
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <MetricPill label="Purchases spent" value={formatMoney(totals.totalPurchasesValue)} />
            <MetricPill label="Sales revenue" value={formatMoney(totals.totalSalesRevenue)} />
            <MetricPill
              label="Inventory cost (sales)"
              value={formatMoney(totals.salesConsumptionValue)}
            />
            <MetricPill label="Inventory out (total)" value={formatMoney(totals.totalInventoryOutflow)} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <MetricPill label="Sales consumption" value={formatQty(totals.salesConsumption, 'units')} />
            <MetricPill label="Wastage" value={formatQty(totals.wastage, 'units')} />
            <MetricPill label="Expected closing" value={formatQty(totals.expectedClosing, 'units')} />
            <MetricPill label="Orders completed" value={totals.completedOrderCount} />
          </div>

          {(alerts?.lowStock.length || alerts?.outOfStock.length || alerts?.highVariance.length) ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {alerts.lowStock.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-caption text-amber-800 uppercase tracking-wider mb-2">Low stock</p>
                  <ul className="text-sm space-y-1">
                    {alerts.lowStock.slice(0, 5).map((i) => (
                      <li key={i.inventoryItemId}>{i.itemName}</li>
                    ))}
                  </ul>
                </div>
              )}
              {alerts.outOfStock.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="font-caption text-red-800 uppercase tracking-wider mb-2">Out of stock</p>
                  <ul className="text-sm space-y-1">
                    {alerts.outOfStock.slice(0, 5).map((i) => (
                      <li key={i.inventoryItemId}>{i.itemName}</li>
                    ))}
                  </ul>
                </div>
              )}
              {alerts.highVariance.length > 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <p className="font-caption text-orange-800 uppercase tracking-wider mb-2">Variance</p>
                  <ul className="text-sm space-y-1">
                    {alerts.highVariance.slice(0, 5).map((i) => (
                      <li key={i.inventoryItemId}>
                        {i.itemName}: {formatQty(i.variance ?? '0', i.unit)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section>
              <h3 className="font-title-lg text-primary mb-3">Stock activity</h3>
              <DataPanel className="table-scroll-shell">
                <table className="w-full text-left min-w-[720px]">
                  <thead>
                    <tr>
                      <th className="px-4 py-2">Item</th>
                      <th className="px-4 py-2">Opening</th>
                      <th className="px-4 py-2">+ Purchased</th>
                      <th className="px-4 py-2">− Sales</th>
                      <th className="px-4 py-2">− Wastage</th>
                      <th className="px-4 py-2">Expected</th>
                      <th className="px-4 py-2">Actual</th>
                      <th className="px-4 py-2">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant">
                          No inventory items yet. Add items in{' '}
                          <Link href={`/${slug}/inventory`} className="text-secondary hover:underline">
                            Inventory
                          </Link>
                          .
                        </td>
                      </tr>
                    ) : (
                      summaryItems.map((row: InventoryDailyItemSummary) => (
                        <tr key={row.inventoryItemId}>
                          <td className="px-4 py-2 font-body-emphasis">{row.itemName}</td>
                          <td className="px-4 py-2">{formatQty(row.openingQuantity, row.unit)}</td>
                          <td className="px-4 py-2 text-green-700">
                            +{formatQty(row.purchased, row.unit)}
                          </td>
                          <td className="px-4 py-2 text-red-700">
                            −{formatQty(row.salesConsumption, row.unit)}
                          </td>
                          <td className="px-4 py-2 text-red-700">
                            −{formatQty(row.wastage, row.unit)}
                          </td>
                          <td className="px-4 py-2">{formatQty(row.expectedClosing, row.unit)}</td>
                          <td className="px-4 py-2">
                            {row.actualClosing != null
                              ? formatQty(row.actualClosing, row.unit)
                              : '—'}
                          </td>
                          <td
                            className={`px-4 py-2 ${
                              row.variance && Number(row.variance) !== 0
                                ? 'text-orange-700 font-body-emphasis'
                                : ''
                            }`}
                          >
                            {row.variance != null ? formatQty(row.variance, row.unit) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </DataPanel>
            </section>

            <section className="space-y-6">
              <div>
                <h3 className="font-title-lg text-primary mb-3">Purchases today</h3>
                {purchases.length === 0 ? (
                  <EmptyState
                    compact
                    icon="add_shopping_cart"
                    title="No purchases yet"
                    description="Record stock received during this shift."
                  />
                ) : (
                  <div className="space-y-2">
                    {purchases.map((p) => (
                      <div key={p.id} className="app-list-card p-4">
                        <div className="flex justify-between gap-2">
                          <p className="font-body-emphasis">{p.itemName}</p>
                          <p className="font-body-emphasis text-primary">
                            {p.totalCost ? formatMoney(p.totalCost) : '—'}
                          </p>
                        </div>
                        <p className="text-sm text-on-surface-variant mt-1">
                          +{formatQty(p.quantity, p.unit)}
                          {p.unitCost ? ` @ ${formatMoney(p.unitCost)}/${p.unit}` : ''}
                        </p>
                        {p.supplier && (
                          <p className="text-xs text-on-surface-variant mt-1">{p.supplier}</p>
                        )}
                      </div>
                    ))}
                    <p className="text-right font-body-emphasis text-primary pt-2">
                      Total: {formatMoney(totals.totalPurchasesValue)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-title-lg text-primary mb-3">Activity log</h3>
                {movements.length === 0 ? (
                  <EmptyState
                    compact
                    icon="history"
                    title="No movements yet"
                    description="Sales, purchases, and adjustments appear here."
                  />
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {movements.map((m) => (
                      <div key={m.id} className="app-list-card p-3 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="font-body-emphasis">{m.itemName}</span>
                          <span
                            className={
                              Number(m.quantityDelta) >= 0 ? 'text-green-700' : 'text-red-700'
                            }
                          >
                            {Number(m.quantityDelta) >= 0 ? '+' : ''}
                            {formatQty(m.quantityDelta, m.unit)}
                          </span>
                        </div>
                        <p className="text-on-surface-variant text-xs mt-1">
                          {movementTypeLabel(m.type)} · {m.createdByName}
                          {m.note ? ` · ${m.note}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {!isLoading && !session && dashboard?.mode === 'closed' && dashboard.session && dashboard.totals && (
        <div className="space-y-6">
          <InventoryDailyCloseSummary
            session={dashboard.session}
            totals={dashboard.totals}
            formatMoney={formatMoney}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                handlePrintCloseReport({
                  session: dashboard.session!,
                  items: dashboard.items ?? [],
                  purchases: dashboard.purchases ?? [],
                  totals: dashboard.totals!,
                  alerts: dashboard.alerts ?? { lowStock: [], outOfStock: [], highVariance: [] },
                })
              }
            >
              <Icon name="print" />
              Print session report
            </Button>
            <Button variant="primary" onClick={() => openSession.mutate({})} loading={openSession.isPending}>
              Open new session
            </Button>
          </div>
        </div>
      )}

      <Modal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} title="Record purchase">
        <form onSubmit={handlePurchase} className="space-y-4">
          <SelectField
            label="Item"
            value={purchaseForm.inventoryItemId}
            onChange={(e) => setPurchaseForm((f) => ({ ...f, inventoryItemId: e.target.value }))}
            options={[{ value: '', label: 'Select item' }, ...itemOptions]}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity"
              type="number"
              min="0.0001"
              step="any"
              value={purchaseForm.quantity}
              onChange={(e) => setPurchaseForm((f) => ({ ...f, quantity: e.target.value }))}
              required
            />
            <Input
              label="Unit cost"
              type="number"
              min="0"
              step="any"
              value={purchaseForm.unitCost}
              onChange={(e) => setPurchaseForm((f) => ({ ...f, unitCost: e.target.value }))}
            />
          </div>
          {SUPPLIER_EXPENSES_ENABLED ? (
            <>
              {/* Supplier ledger linking — requires SUPPLIER_EXPENSES_ENABLED */}
              <SelectField
                label="Supplier"
                value={purchaseForm.supplierId}
                onChange={(e) =>
                  setPurchaseForm((f) => ({ ...f, supplierId: e.target.value, supplier: '' }))
                }
                options={[{ value: '', label: 'Select supplier' }]}
              />
              {!purchaseForm.supplierId && (
                <Input
                  label="Or type supplier name"
                  value={purchaseForm.supplier}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, supplier: e.target.value }))}
                />
              )}
            </>
          ) : (
            <Input
              label="Supplier"
              value={purchaseForm.supplier}
              onChange={(e) => setPurchaseForm((f) => ({ ...f, supplier: e.target.value }))}
            />
          )}
          <Input
            label="Invoice / reference"
            value={purchaseForm.invoiceRef}
            onChange={(e) => setPurchaseForm((f) => ({ ...f, invoiceRef: e.target.value }))}
          />
          <Textarea
            label="Notes"
            value={purchaseForm.notes}
            onChange={(e) => setPurchaseForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
          {error && <p className="font-caption text-error">{error}</p>}
          <Button type="submit" variant="primary" loading={recordPurchase.isPending} className="w-full">
            Confirm purchase
          </Button>
        </form>
      </Modal>

      <Modal open={wastageOpen} onClose={() => setWastageOpen(false)} title="Record wastage">
        <form onSubmit={handleWastage} className="space-y-4">
          <SelectField
            label="Item"
            value={wastageForm.inventoryItemId}
            onChange={(e) => setWastageForm((f) => ({ ...f, inventoryItemId: e.target.value }))}
            options={[{ value: '', label: 'Select item' }, ...itemOptions]}
            required
          />
          <Input
            label="Quantity wasted"
            type="number"
            min="0.0001"
            step="any"
            value={wastageForm.quantity}
            onChange={(e) => setWastageForm((f) => ({ ...f, quantity: e.target.value }))}
            required
          />
          <SelectField
            label="Reason"
            value={wastageForm.reason}
            onChange={(e) =>
              setWastageForm((f) => ({ ...f, reason: e.target.value as InventoryWastageReason }))
            }
            options={WASTAGE_REASONS}
          />
          <Textarea
            label="Notes"
            value={wastageForm.notes}
            onChange={(e) => setWastageForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
          {error && <p className="font-caption text-error">{error}</p>}
          <Button type="submit" variant="primary" loading={recordWastage.isPending} className="w-full">
            Record wastage
          </Button>
        </form>
      </Modal>

      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Stock adjustment">
        <form onSubmit={handleAdjustment} className="space-y-4">
          <SelectField
            label="Item"
            value={adjustForm.inventoryItemId}
            onChange={(e) => setAdjustForm((f) => ({ ...f, inventoryItemId: e.target.value }))}
            options={[{ value: '', label: 'Select item' }, ...itemOptions]}
            required
          />
          <Input
            label="Quantity change (+ or −)"
            type="number"
            step="any"
            value={adjustForm.quantityDelta}
            onChange={(e) => setAdjustForm((f) => ({ ...f, quantityDelta: e.target.value }))}
            required
          />
          <Textarea
            label="Reason"
            value={adjustForm.note}
            onChange={(e) => setAdjustForm((f) => ({ ...f, note: e.target.value }))}
            rows={2}
          />
          {error && <p className="font-caption text-error">{error}</p>}
          <Button type="submit" variant="primary" loading={recordAdjustment.isPending} className="w-full">
            Save adjustment
          </Button>
        </form>
      </Modal>

      <Modal
        open={closeReportOpen}
        onClose={() => {
          setCloseReportOpen(false);
          setClosedReport(null);
        }}
        title="Inventory shift closed"
        description="Session closed. Review money in and out for this shift."
        size="lg"
        footer={
          closedReport ? (
            <>
              <Button variant="outline" onClick={() => handlePrintCloseReport(closedReport)}>
                <Icon name="print" className="text-base" />
                Print report
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setCloseReportOpen(false);
                  setClosedReport(null);
                }}
              >
                Done
              </Button>
            </>
          ) : undefined
        }
      >
        {closedReport ? (
          <InventoryDailyCloseSummary
            session={closedReport.session}
            totals={closedReport.totals}
            formatMoney={formatMoney}
          />
        ) : null}
      </Modal>

      <Modal open={closeOpen} onClose={() => setCloseOpen(false)} title="Close shift — physical count" size="lg">
        <form onSubmit={handleCloseSession} className="space-y-4 max-h-[70vh] overflow-y-auto">
          {session && totals ? (
            <InventoryDailyCloseSummary session={session} totals={totals} formatMoney={formatMoney} />
          ) : null}
          <p className="text-sm text-on-surface-variant">
            Enter the actual physical quantity for each item. Variance is calculated automatically.
          </p>
          {summaryItems.map((item) => (
            <div key={item.inventoryItemId} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-body-emphasis truncate">{item.itemName}</p>
                <p className="text-xs text-on-surface-variant">
                  Expected: {formatQty(item.expectedClosing, item.unit)}
                </p>
              </div>
              <Input
                type="number"
                step="any"
                className="w-28"
                value={actualCounts[item.inventoryItemId] ?? ''}
                onChange={(e) =>
                  setActualCounts((c) => ({ ...c, [item.inventoryItemId]: e.target.value }))
                }
              />
            </div>
          ))}
          <Textarea
            label="Closing notes"
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
            rows={2}
          />
          {error && <p className="font-caption text-error">{error}</p>}
          <Button type="submit" variant="primary" loading={closeSession.isPending} className="w-full">
            Close session
          </Button>
        </form>
      </Modal>
    </BusinessLayout>
  );
}
