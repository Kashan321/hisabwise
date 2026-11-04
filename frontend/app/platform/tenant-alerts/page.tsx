'use client';

import { useState } from 'react';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import { ImageUploadField } from '@/components/files/image-upload-field';
import { Button, Input, Textarea } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import type { PlatformTenantAlert } from '@/lib/api/types';
import {
  useCreatePlatformTenantAlert,
  useDeletePlatformTenantAlert,
  useUpdatePlatformTenantAlert,
} from '@/lib/hooks/mutations';
import { usePlatformTenantAlerts } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';

type FormState = {
  bodyText: string;
  linkUrl: string;
  linkLabel: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = (): FormState => ({
  bodyText: '',
  linkUrl: '',
  linkLabel: '',
  imageUrl: null,
  startDate: todayIsoDate(),
  endDate: todayIsoDate(),
  isActive: false,
});

export default function PlatformTenantAlertsPage() {
  const toast = useToast();
  const { data: alerts = [], isLoading } = usePlatformTenantAlerts();
  const createAlert = useCreatePlatformTenantAlert();
  const updateAlert = useUpdatePlatformTenantAlert();
  const deleteAlert = useDeletePlatformTenantAlert();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformTenantAlert | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState('');

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setEditorOpen(true);
  }

  function openEdit(alert: PlatformTenantAlert) {
    setEditing(alert);
    setForm({
      bodyText: alert.bodyText,
      linkUrl: alert.linkUrl ?? '',
      linkLabel: alert.linkLabel ?? '',
      imageUrl: alert.imageUrl,
      startDate: alert.startDate,
      endDate: alert.endDate,
      isActive: alert.isActive,
    });
    setError('');
    setEditorOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const bodyText = form.bodyText.trim();
    if (!bodyText) {
      setError('Message text is required.');
      return;
    }
    if (form.endDate < form.startDate) {
      setError('End date must be on or after start date.');
      return;
    }

    const payload = {
      bodyText,
      linkUrl: form.linkUrl.trim() || null,
      linkLabel: form.linkLabel.trim() || null,
      imageUrl: form.imageUrl,
      startDate: form.startDate,
      endDate: form.endDate,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        await updateAlert.mutateAsync({ id: editing.id, ...payload });
        toast.success('Alert updated');
      } else {
        await createAlert.mutateAsync(payload);
        toast.success('Alert created');
      }
      setEditorOpen(false);
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      toast.error(msg);
    }
  }

  async function toggleActive(alert: PlatformTenantAlert) {
    try {
      await updateAlert.mutateAsync({ id: alert.id, isActive: !alert.isActive });
      toast.success(alert.isActive ? 'Alert deactivated' : 'Alert activated');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function handleDelete(alert: PlatformTenantAlert) {
    if (!window.confirm('Delete this alert?')) return;
    try {
      await deleteAlert.mutateAsync(alert.id);
      toast.success('Alert deleted');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <PlatformLayout hideHeaderTitle>
      <PageHeader
        title="Tenant alerts"
        description="Promotions and announcements shown as an overlay when tenants sign in. Dismissed for the day per user; shown again on the next calendar day until the end date."
        actions={
          <Button type="button" variant="primary" onClick={openCreate}>
            New alert
          </Button>
        }
      />

      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-on-surface-variant text-sm">Loading…</p>
        ) : alerts.length === 0 ? (
          <p className="p-6 text-on-surface-variant text-sm">No alerts yet.</p>
        ) : (
          <ul className="divide-y divide-outline-variant/15">
            {alerts.map((alert) => (
              <li key={alert.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface line-clamp-3 whitespace-pre-wrap">
                    {alert.bodyText}
                  </p>
                  <p className="mt-2 font-caption text-on-surface-variant">
                    {alert.startDate} → {alert.endDate}
                    {alert.linkUrl ? ` · ${alert.linkLabel || 'Link'}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span
                    className={`font-caption uppercase px-2 py-1 rounded-full ${
                      alert.isActive
                        ? 'bg-tertiary-container text-on-tertiary-container'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {alert.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="!px-3 !py-1.5 text-sm"
                    onClick={() => toggleActive(alert)}
                  >
                    {alert.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 text-sm"
                    onClick={() => openEdit(alert)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="!px-3 !py-1.5 text-sm"
                    onClick={() => handleDelete(alert)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit alert' : 'New alert'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Textarea
            label="Message"
            value={form.bodyText}
            onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
            rows={5}
            required
            placeholder="Promotion or announcement text…"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Link URL (optional)"
              type="url"
              value={form.linkUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
              placeholder="https://…"
            />
            <Input
              label="Link label (optional)"
              value={form.linkLabel}
              onChange={(e) => setForm((f) => ({ ...f, linkLabel: e.target.value }))}
              placeholder="Learn more"
            />
          </div>
          <ImageUploadField
            label="Image (optional)"
            value={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
            folder="tenant-alerts"
            uploadAuth="platform"
            platformScope="tenant-alerts"
            allowPasteUrl
            hint="JPEG, PNG, WebP — or paste an image URL"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              required
            />
            <Input
              label="End date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              required
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-outline-variant"
            />
            <span className="text-sm font-medium">Active (show to tenants in date range)</span>
          </label>

          {error && (
            <p className="text-sm text-error bg-error-container/30 px-3 py-2 rounded-xl">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createAlert.isPending || updateAlert.isPending}
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </PlatformLayout>
  );
}
