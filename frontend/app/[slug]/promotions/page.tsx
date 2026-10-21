'use client';

import { use, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Button, Icon, Input, SelectField, ListCardSkeleton } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import { useCreatePromotion, useTogglePromotion } from '@/lib/hooks/mutations';
import { usePromotions } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';

const emptyForm = {
  title: '',
  description: '',
  discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  discountValue: '10',
  startDate: '',
  endDate: '',
};

export default function PromotionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const { data: promotions = [], isLoading } = usePromotions();
  const createPromotion = useCreatePromotion();
  const togglePromotion = useTogglePromotion();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createPromotion.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      });
      toast.success('Promotion created');
      setForm(emptyForm);
      setModalOpen(false);
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      toast.error(msg);
    }
  }

  function toggle(id: string, isActive: boolean) {
    togglePromotion.mutate(
      { id, activate: !isActive },
      {
        onSuccess: () =>
          toast.success(isActive ? 'Promotion deactivated' : 'Promotion activated'),
        onError: (err) => toast.error(formatApiError(err)),
      },
    );
  }

  return (
    <BusinessLayout slug={slug}>
      <PageHeader
        icon="local_offer"
        title="Promotions"
        description="Create discounts and special offers for your customers."
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Icon name="add" />
            New promotion
          </Button>
        }
      />

      <div className="rounded-2xl border-2 border-outline-variant/10 bg-white overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant/20">
          <h3 className="font-title-lg text-primary">All promotions</h3>
        </div>
        {isLoading && <ListCardSkeleton count={4} />}
        {!isLoading && promotions.length === 0 && (
          <EmptyState
            icon="local_offer"
            title="No promotions"
            description="Create your first offer."
            action={
              <Button variant="secondary" onClick={() => setModalOpen(true)}>
                New promotion
              </Button>
            }
          />
        )}
        <div className="divide-y divide-outline-variant/10">
          {promotions.map((p) => (
            <div key={p.id} className="app-list-card flex items-center justify-between gap-4 p-4 m-3 first:mt-3">
              <div>
                <p className="font-body-emphasis">{p.title}</p>
                <p className="font-caption text-on-surface-variant">
                  {p.discountType === 'PERCENTAGE'
                    ? `${p.discountValue}% off`
                    : `$${Number(p.discountValue).toFixed(2)} off`}{' '}
                  · {new Date(p.startDate).toLocaleDateString()} –{' '}
                  {new Date(p.endDate).toLocaleDateString()}
                </p>
              </div>
              <Button
                type="button"
                variant={p.isActive ? 'outline' : 'primary'}
                onClick={() => toggle(p.id, p.isActive)}
                loading={togglePromotion.isPending}
              >
                {p.isActive ? 'Deactivate' : 'Activate'}
              </Button>
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
        title="New promotion"
        description="Set up a discount or special offer for your customers."
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
              form="promotion-form"
              loading={createPromotion.isPending}
            >
              Create promotion
            </Button>
          </>
        }
      >
        <form id="promotion-form" onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            autoFocus
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <SelectField
              label="Discount type"
              value={form.discountType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  discountType: e.target.value as 'PERCENTAGE' | 'FIXED',
                }))
              }
              options={[
                { value: 'PERCENTAGE', label: 'Percentage' },
                { value: 'FIXED', label: 'Fixed amount' },
              ]}
            />
            <Input
              label="Value"
              type="number"
              min={0}
              step="0.01"
              value={form.discountValue}
              onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
              required
            />
            <Input
              label="Start date"
              type="datetime-local"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              required
            />
            <Input
              label="End date"
              type="datetime-local"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              required
            />
          </div>
          {error && <p className="font-caption text-error">{error}</p>}
        </form>
      </Modal>
    </BusinessLayout>
  );
}
