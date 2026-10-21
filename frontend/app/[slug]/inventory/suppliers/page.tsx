'use client';

import Link from 'next/link';
import { use, useMemo, useState } from 'react';
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
  Textarea,
} from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { EmptyState, MetricPill, PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import type { SupplierAccount } from '@/lib/api/types';
import {
  useCreateSupplier,
  useRecordSupplierPayment,
  useUpdateSupplier,
} from '@/lib/hooks/mutations';
import { useBusiness, useReceiptTemplate, useSupplierLedger, useSuppliers } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { printSupplierLedgerReport } from '@/lib/print-supplier-ledger-report';
import { SUPPLIER_EXPENSES_ENABLED } from '@/lib/feature-flags';
import { useToast } from '@/lib/toast';

function balanceLabel(balanceDue: string, formatMoney: (v: number | string) => string) {
  const n = Number(balanceDue);
  if (Number.isNaN(n) || Math.abs(n) < 0.005) return { text: 'Settled', variant: 'success' as const };
  if (n > 0) return { text: `Owes ${formatMoney(n)}`, variant: 'neutral' as const };
  return { text: `Prepaid ${formatMoney(Math.abs(n))} left`, variant: 'success' as const };
}

function SupplierExpensesPageImpl({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { data: business } = useBusiness();
  const { data: receiptTemplate } = useReceiptTemplate();
  const { data: suppliers = [], isLoading } = useSuppliers();

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const recordPayment = useRecordSupplierPayment();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState('');

  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    openingBalanceOwed: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    openingBalanceOwed: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    notes: '',
  });

  const { data: ledgerData, isLoading: ledgerLoading } = useSupplierLedger(detailId ?? undefined);

  const totals = useMemo(() => {
    let purchased = 0;
    let paid = 0;
    let owed = 0;
    for (const s of suppliers) {
      purchased += Number(s.totalPurchased) || 0;
      paid += Number(s.totalPaid) || 0;
      const bal = Number(s.balanceDue) || 0;
      if (bal > 0) owed += bal;
    }
    return { purchased, paid, owed };
  }, [suppliers]);

  const selected = suppliers.find((s) => s.id === detailId);

  function handlePrintLedger() {
    if (!ledgerData) return;
    printSupplierLedgerReport({
      supplier: ledgerData.supplier,
      ledger: ledgerData.ledger,
      businessName: business?.name,
      businessLocation: business?.location,
      formatMoney,
      widthMm: receiptTemplate?.receiptWidthMm ?? 80,
    });
  }

  function openDetail(s: SupplierAccount) {
    setDetailId(s.id);
    setEditForm({
      name: s.name,
      phone: s.phone ?? '',
      email: s.email ?? '',
      notes: s.notes ?? '',
      openingBalanceOwed: s.openingBalanceOwed,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createSupplier.mutateAsync({
        name: createForm.name.trim(),
        phone: createForm.phone.trim() || undefined,
        email: createForm.email.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
        openingBalanceOwed: createForm.openingBalanceOwed
          ? Number(createForm.openingBalanceOwed)
          : undefined,
      });
      toast.success('Supplier added');
      setCreateOpen(false);
      setCreateForm({ name: '', phone: '', email: '', notes: '', openingBalanceOwed: '' });
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!detailId) return;
    setError('');
    try {
      await updateSupplier.mutateAsync({
        id: detailId,
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        notes: editForm.notes.trim() || null,
        openingBalanceOwed: Number(editForm.openingBalanceOwed) || 0,
      });
      toast.success('Supplier updated');
      setEditOpen(false);
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!detailId) return;
    setError('');
    try {
      await recordPayment.mutateAsync({
        supplierId: detailId,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      });
      toast.success('Payment recorded');
      setPaymentOpen(false);
      setPaymentForm({ amount: '', method: 'CASH', reference: '', notes: '' });
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <BusinessLayout slug={slug}>
      <PageHeader
        icon="local_shipping"
        title="Supplier expenses"
        description="Track purchases per supplier, payments made, and remaining balance."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/${slug}/inventory`}>
              <Button variant="outline">
                <Icon name="inventory_2" />
                Stock items
              </Button>
            </Link>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Icon name="add" />
              Add supplier
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <MetricPill label="Total purchased" value={formatMoney(totals.purchased)} />
        <MetricPill label="Total paid out" value={formatMoney(totals.paid)} />
        <MetricPill label="Total still owed" value={formatMoney(totals.owed)} />
      </div>

      {isLoading ? (
        <DataTableLoading rows={5} cols={5} />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon="local_shipping"
          title="No suppliers yet"
          description="Add suppliers to track how much you buy from each and how much you have paid."
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              Add supplier
            </Button>
          }
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeadCell>Supplier</DataTableHeadCell>
              <DataTableHeadCell>Purchased</DataTableHeadCell>
              <DataTableHeadCell>Paid</DataTableHeadCell>
              <DataTableHeadCell>Balance</DataTableHeadCell>
              <DataTableHeadCell className="text-right">Actions</DataTableHeadCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {suppliers.map((s) => {
              const bal = balanceLabel(s.balanceDue, formatMoney);
              return (
                <DataTableRow key={s.id}>
                  <DataTableCell>
                    <p className="font-body-emphasis">{s.name}</p>
                    {s.phone && (
                      <p className="text-xs text-on-surface-variant mt-0.5">{s.phone}</p>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="font-mono tabular-nums">{formatMoney(s.totalPurchased)}</span>
                    <p className="text-xs text-on-surface-variant">{s.purchaseCount} purchase(s)</p>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="font-mono tabular-nums">{formatMoney(s.totalPaid)}</span>
                    <p className="text-xs text-on-surface-variant">{s.paymentCount} payment(s)</p>
                  </DataTableCell>
                  <DataTableCell>
                    <StatusChip variant={bal.variant} label={bal.text} />
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <Button variant="outline" className="!h-9" onClick={() => openDetail(s)}>
                      View
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add supplier">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Name"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Phone"
            value={createForm.phone}
            onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Opening balance owed"
            type="number"
            min="0"
            step="any"
            hint="Amount you already owed this supplier before using Hisab Wise"
            value={createForm.openingBalanceOwed}
            onChange={(e) => setCreateForm((f) => ({ ...f, openingBalanceOwed: e.target.value }))}
          />
          <Textarea
            label="Notes"
            rows={2}
            value={createForm.notes}
            onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
          />
          {error && <p className="font-caption text-error">{error}</p>}
          <Button type="submit" variant="primary" loading={createSupplier.isPending} className="w-full">
            Save supplier
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={selected?.name ?? 'Supplier'}
        size="lg"
        footer={
          selected ? (
            <>
              <Button
                variant="outline"
                onClick={handlePrintLedger}
                disabled={!ledgerData || ledgerLoading}
              >
                <Icon name="print" className="text-base" />
                Print history
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button variant="primary" onClick={() => setPaymentOpen(true)}>
                <Icon name="payments" />
                Record payment
              </Button>
            </>
          ) : undefined
        }
      >
        {ledgerLoading && <p className="text-sm text-on-surface-variant">Loading ledger…</p>}
        {ledgerData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricPill label="Purchased" value={formatMoney(ledgerData.supplier.totalPurchased)} />
              <MetricPill label="Paid" value={formatMoney(ledgerData.supplier.totalPaid)} />
              <MetricPill
                label="Balance"
                value={formatMoney(Math.abs(Number(ledgerData.supplier.balanceDue)))}
              />
              <MetricPill
                label="Status"
                value={balanceLabel(ledgerData.supplier.balanceDue, formatMoney).text}
              />
            </div>
            <p className="text-sm text-on-surface-variant">
              Link this supplier when recording daily inventory purchases to keep balances accurate.
            </p>
            {ledgerData.ledger.length === 0 ? (
              <EmptyState
                compact
                icon="receipt_long"
                title="No activity yet"
                description="Purchases and payments will appear here."
              />
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {ledgerData.ledger.map((row) => (
                  <div key={`${row.type}-${row.id}`} className="app-list-card p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-body-emphasis">{row.label}</span>
                      <span
                        className={
                          row.direction === 'debit' ? 'text-red-700 font-mono' : 'text-green-700 font-mono'
                        }
                      >
                        {row.direction === 'debit' ? '+' : '−'}
                        {formatMoney(row.amount)}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {row.type === 'PURCHASE' ? 'Purchase' : 'Payment'} ·{' '}
                      {new Date(row.date).toLocaleString()} · {row.createdByName}
                      {row.reference ? ` · ${row.reference}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit supplier">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Name"
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Phone"
            value={editForm.phone}
            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Opening balance owed"
            type="number"
            min="0"
            step="any"
            value={editForm.openingBalanceOwed}
            onChange={(e) => setEditForm((f) => ({ ...f, openingBalanceOwed: e.target.value }))}
          />
          <Textarea
            label="Notes"
            rows={2}
            value={editForm.notes}
            onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
          />
          {error && <p className="font-caption text-error">{error}</p>}
          <Button type="submit" variant="primary" loading={updateSupplier.isPending} className="w-full">
            Save changes
          </Button>
        </form>
      </Modal>

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record payment to supplier">
        <form onSubmit={handlePayment} className="space-y-4">
          <Input
            label="Amount"
            type="number"
            min="0.01"
            step="any"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <SelectField
            label="Method"
            value={paymentForm.method}
            onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
            options={[
              { value: 'CASH', label: 'Cash' },
              { value: 'BANK', label: 'Bank transfer' },
              { value: 'CARD', label: 'Card' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
          <Input
            label="Reference"
            value={paymentForm.reference}
            onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
          />
          <Textarea
            label="Notes"
            rows={2}
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
          />
          {error && <p className="font-caption text-error">{error}</p>}
          <Button type="submit" variant="primary" loading={recordPayment.isPending} className="w-full">
            Confirm payment
          </Button>
        </form>
      </Modal>
    </BusinessLayout>
  );
}

function SupplierExpensesDisabled({ slug }: { slug: string }) {
  return (
    <BusinessLayout slug={slug}>
      <PageHeader
        icon="local_shipping"
        title="Supplier expenses"
        description="This feature is currently turned off."
      />
      <p className="text-sm text-on-surface-variant">
        <Link href={`/${slug}/inventory`} className="text-secondary hover:underline">
          Back to inventory
        </Link>
      </p>
    </BusinessLayout>
  );
}

export default function SupplierExpensesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  if (!SUPPLIER_EXPENSES_ENABLED) {
    return <SupplierExpensesDisabled slug={slug} />;
  }
  return <SupplierExpensesPageImpl params={params} />;
}
