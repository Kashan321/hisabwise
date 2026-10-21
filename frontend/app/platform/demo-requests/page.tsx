'use client';

import { useState } from 'react';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import { Button, Icon, SelectField, Spinner, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-shell';
import { Modal } from '@/components/ui/modal';
import { formatApiError } from '@/lib/api/errors';
import type { DemoRequest, DemoRequestStatus } from '@/lib/api/types';
import { useUpdateDemoRequestStatus } from '@/lib/hooks/mutations';
import { usePlatformDemoRequests } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';

const STATUS_OPTIONS: { value: DemoRequestStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_BADGE: Record<DemoRequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function PlatformDemoRequestsPage() {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<DemoRequestStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<DemoRequest | null>(null);
  const [nextStatus, setNextStatus] = useState<DemoRequestStatus>('CONTACTED');
  const [adminNote, setAdminNote] = useState('');

  const { data: requests = [], isLoading } = usePlatformDemoRequests(
    statusFilter === 'ALL' ? undefined : { status: statusFilter },
  );
  const updateStatus = useUpdateDemoRequestStatus();

  async function handleUpdate() {
    if (!selected) return;
    try {
      await updateStatus.mutateAsync({
        id: selected.id,
        status: nextStatus,
        adminNote: adminNote.trim() || undefined,
      });
      toast.success('Demo request updated');
      setSelected(null);
      setAdminNote('');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <PlatformLayout hideHeaderTitle>
      <PageHeader
        title="Demo requests"
        description="Bookings from the landing page Calendly widget and manual demo form."
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SelectField
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DemoRequestStatus | 'ALL')}
          options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          className="w-48"
        />
        <p className="font-caption text-on-surface-variant">
          Set your Calendly URL under Platform → Appearance.
        </p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/10 bg-white p-12 text-center">
          <Icon name="event_busy" className="text-4xl text-on-surface-variant mb-3" />
          <p className="font-body-base text-on-surface-variant">No demo requests yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-variant/10 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-left">
              <tr>
                <th className="px-4 py-3 font-body-emphasis">Contact</th>
                <th className="px-4 py-3 font-body-emphasis">Scheduled</th>
                <th className="px-4 py-3 font-body-emphasis">Source</th>
                <th className="px-4 py-3 font-body-emphasis">Status</th>
                <th className="px-4 py-3 font-body-emphasis">Received</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-t border-outline-variant/10">
                  <td className="px-4 py-3">
                    <p className="font-body-emphasis">{request.name}</p>
                    <p className="font-caption text-on-surface-variant">{request.email}</p>
                    {request.company && (
                      <p className="font-caption text-on-surface-variant">{request.company}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-caption">
                    {request.eventName && <p>{request.eventName}</p>}
                    <p>{formatDate(request.scheduledAt)}</p>
                  </td>
                  <td className="px-4 py-3 font-caption">{request.source}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[request.status]}`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-caption">{formatDate(request.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSelected(request);
                        setNextStatus(
                          request.status === 'SCHEDULED' ? 'CONTACTED' : request.status,
                        );
                        setAdminNote(request.adminNote ?? '');
                      }}
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Update demo request"
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-container-low p-4 text-sm space-y-1">
              <p className="font-body-emphasis">{selected.name}</p>
              <p>{selected.email}</p>
              {selected.phone && <p>{selected.phone}</p>}
              {selected.company && <p>{selected.company}</p>}
            </div>

            <SelectField
              label="Status"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as DemoRequestStatus)}
              options={STATUS_OPTIONS.filter((o) => o.value !== 'ALL').map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />

            <Textarea
              label="Admin note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={updateStatus.isPending}
                onClick={handleUpdate}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PlatformLayout>
  );
}
