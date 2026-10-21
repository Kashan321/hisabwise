'use client';

import { use, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Button, Icon, Input, SelectField, ListCardSkeleton } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import { useCreateReservation, useUpdateReservationStatus } from '@/lib/hooks/mutations';
import { useFloorTables, useReservations } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';

const emptyForm = {
  customerName: '',
  customerContact: '',
  partySize: '2',
  reservationTime: '',
  tableId: '',
  notes: '',
};

export default function ReservationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const { data: reservations = [], isLoading } = useReservations();
  const { data: tables = [] } = useFloorTables();
  const createReservation = useCreateReservation();
  const updateStatus = useUpdateReservationStatus();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createReservation.mutateAsync({
        customerName: form.customerName.trim(),
        customerContact: form.customerContact.trim() || undefined,
        partySize: Number(form.partySize) || 2,
        reservationTime: new Date(form.reservationTime).toISOString(),
        tableId: form.tableId || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success('Reservation created');
      setForm(emptyForm);
      setModalOpen(false);
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      toast.error(msg);
    }
  }

  function confirmReservation(id: string) {
    updateStatus.mutate(
      { id, status: 'CONFIRMED' },
      {
        onSuccess: () => toast.success('Reservation confirmed'),
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  const tableMap = Object.fromEntries(tables.map((t) => [t.id, t.tableIdentifier]));

  return (
    <BusinessLayout slug={slug}>
      <PageHeader
        icon="event"
        title="Reservations"
        description="Manage table bookings and guest arrivals."
        actions={
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            <Icon name="add" />
            New reservation
          </Button>
        }
      />

      <div className="rounded-2xl border-2 border-outline-variant/10 bg-white overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant/20">
          <h3 className="font-title-lg text-primary">Upcoming</h3>
        </div>
        {isLoading && <ListCardSkeleton count={4} />}
        {!isLoading && reservations.length === 0 && (
          <EmptyState
            icon="event"
            title="No reservations yet"
            description="Create a booking for walk-ins or phone requests."
            action={
              <Button variant="secondary" onClick={() => setModalOpen(true)}>
                New reservation
              </Button>
            }
          />
        )}
        <div className="divide-y divide-outline-variant/10">
          {reservations.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-4 p-4 hover:bg-surface-container-low/50"
            >
              <div>
                <p className="font-body-emphasis">{r.customerName}</p>
                <p className="font-caption text-on-surface-variant">
                  {new Date(r.reservationTime).toLocaleString()} · {r.partySize} guests
                  {r.tableId ? ` · ${tableMap[r.tableId] ?? 'Table'}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-caption px-2 py-0.5 rounded bg-surface-container-high capitalize">
                  {r.status.toLowerCase()}
                </span>
                {r.status === 'PENDING' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => confirmReservation(r.id)}
                    loading={updateStatus.isPending}
                  >
                    Confirm
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError('');
          setForm(emptyForm);
        }}
        title="New reservation"
        description="Book a table for walk-ins or phone requests."
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setModalOpen(false);
                setError('');
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="reservation-form"
              loading={createReservation.isPending}
            >
              Save reservation
            </Button>
          </>
        }
      >
        <form id="reservation-form" onSubmit={handleCreate} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Guest name"
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              required
              autoFocus
            />
            <Input
              label="Contact"
              value={form.customerContact}
              onChange={(e) => setForm((f) => ({ ...f, customerContact: e.target.value }))}
            />
            <Input
              label="Party size"
              type="number"
              min={1}
              value={form.partySize}
              onChange={(e) => setForm((f) => ({ ...f, partySize: e.target.value }))}
            />
            <Input
              label="Date & time"
              type="datetime-local"
              value={form.reservationTime}
              onChange={(e) => setForm((f) => ({ ...f, reservationTime: e.target.value }))}
              required
            />
          </div>
          <SelectField
            label="Table"
            value={form.tableId}
            onChange={(e) => setForm((f) => ({ ...f, tableId: e.target.value }))}
            options={[
              { value: '', label: 'Any table' },
              ...tables.map((t) => ({
                value: t.id,
                label: `${t.tableIdentifier} (${t.capacity} seats)`,
              })),
            ]}
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional special requests"
          />
          {error && <p className="font-caption text-error">{error}</p>}
        </form>
      </Modal>
    </BusinessLayout>
  );
}
