'use client';

import { use, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Button, Icon, Input } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import type { Customer } from '@/lib/api/types';
import { useCreateCustomer, useUpdateCustomer } from '@/lib/hooks/mutations';
import { useCustomers } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';

type CustomerForm = {
  name: string;
  email: string;
  phoneNumber: string;
  deliveryAddress: string;
};

const EMPTY_FORM: CustomerForm = {
  name: '',
  email: '',
  phoneNumber: '',
  deliveryAddress: '',
};

export default function CustomersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const { data: customers = [], isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [error, setError] = useState('');

  function openCreate() {
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      email: customer.email ?? '',
      phoneNumber: customer.phoneNumber ?? '',
      deliveryAddress: customer.deliveryAddress ?? '',
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editingCustomer) {
        await updateCustomer.mutateAsync({
          id: editingCustomer.id,
          name: form.name.trim(),
          email: form.email.trim() || null,
          phoneNumber: form.phoneNumber.trim() || null,
          deliveryAddress: form.deliveryAddress.trim() || null,
        });
        toast.success('Customer updated');
      } else {
        await createCustomer.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phoneNumber: form.phoneNumber.trim() || undefined,
          deliveryAddress: form.deliveryAddress.trim() || undefined,
        });
        toast.success('Customer added');
      }
      setForm(EMPTY_FORM);
      setEditingCustomer(null);
      setModalOpen(false);
    } catch (err) {
      setError(formatApiError(err));
      toast.error(formatApiError(err));
    }
  }

  return (
    <BusinessLayout slug={slug}>
      <PageHeader
        icon="group"
        title="Customers"
        description="Track regulars, delivery addresses, and loyalty points."
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Icon name="person_add" />
            Add customer
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-surface-container-low animate-pulse" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon="group"
          title="No customers yet"
          description="Add customers manually or they'll appear when linked to completed orders."
          action={
            <Button variant="primary" onClick={openCreate}>
              Add customer
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div
              key={c.id}
              className="app-list-card p-4 flex gap-4 items-start hover:scale-[1.01] transition-transform"
            >
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary flex items-center justify-center font-bold text-lg">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-on-surface truncate">{c.name}</p>
                <p className="text-sm text-on-surface-variant mt-0.5 truncate">
                  {c.email ?? c.phoneNumber ?? 'No contact info'}
                </p>
                {c.deliveryAddress && (
                  <p className="text-xs text-on-surface-variant/80 mt-1 line-clamp-2">
                    {c.deliveryAddress}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed/60 text-on-secondary-fixed-variant text-xs font-bold">
                    <Icon name="loyalty" className="text-sm" filled />
                    {c.loyaltyPoints} pts
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-outline-variant/25 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    <Icon name="edit" className="text-sm" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCustomer(null);
          setError('');
        }}
        title={editingCustomer ? 'Edit customer' : 'Add customer'}
        description="Store contact and delivery details for repeat orders."
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              className="!h-10 sm:!h-auto"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="customer-form"
              className="!h-10 sm:!h-auto"
              loading={createCustomer.isPending || updateCustomer.isPending}
            >
              {editingCustomer ? 'Save changes' : 'Save customer'}
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Phone"
            value={form.phoneNumber}
            onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
          />
          <Input
            label="Delivery address"
            value={form.deliveryAddress}
            onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
            hint="Used to auto-fill delivery orders for this customer."
          />
          {error && <p className="font-caption text-error">{error}</p>}
        </form>
      </Modal>
    </BusinessLayout>
  );
}
