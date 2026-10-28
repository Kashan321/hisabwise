'use client';

import { useMemo, useState } from 'react';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import { Button, Icon, IconButton, Input, SelectField, Spinner, TableSkeleton } from '@/components/ui';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { usePlatformBusiness, usePlatformBusinesses, usePlatformMetrics } from '@/lib/hooks/queries';
import {
  useCreateBusiness,
  useDeleteBusiness,
  useReactivateBusiness,
  useSuspendBusiness,
  useUpdateBusinessSubscription,
  useSetBusinessTrialDays,
  useBlockBusinessSubscription,
  useUnblockBusinessSubscription,
} from '@/lib/hooks/mutations';
import { formatApiError } from '@/lib/api/errors';
import { useToast } from '@/lib/toast';
import { APP_NAME } from '@/lib/config';
import { sanitizeSlugInput, slugify } from '@/lib/validation/slug';
import type { PlatformBusiness } from '@/lib/api/types';
import {
  adminSubscriptionAccessLabel,
  getSubscriptionDaysRemaining,
  getSubscriptionPeriodEnd,
  platformAccessPhaseBadge,
  platformBusinessMatchesFilter,
  type PlatformSubscriptionFilter,
} from '@/lib/subscription-display';
import { RenewSubscriptionPanel } from '@/components/platform/renew-subscription-panel';
import {
  ThemeEditor,
  isThemeValid,
  normalizeTheme,
  type ThemeEditorValue,
} from '@/components/theme/theme-editor';
import { DEFAULT_BUSINESS_THEME } from '@/lib/theme/theme-css';
import { SendSubscriptionInvoicePanel } from '@/components/platform/send-subscription-invoice-panel';

type StatusFilter = PlatformSubscriptionFilter;

const BUSINESS_ICONS = ['coffee', 'bakery_dining', 'restaurant', 'local_cafe'] as const;

const emptyCreateForm = {
  businessName: '',
  businessSlug: '',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
  subscriptionStatus: 'TRIAL' as 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIAL',
  trialDays: '14',
};

function businessIcon(name: string, suspended: boolean) {
  const idx = name.charCodeAt(0) % BUSINESS_ICONS.length;
  return suspended ? 'do_not_disturb_on' : BUSINESS_ICONS[idx];
}

function businessStatus(b: PlatformBusiness): 'suspended' | 'trial' | 'active' | 'expired' {
  if (b.isSuspended) return 'suspended';
  if (platformAccessPhaseBadge(b.accessPhase) === 'expired') return 'expired';
  if (b.subscriptionStatus === 'TRIAL') return 'trial';
  return 'active';
}

function StatusBadge({ status }: { status: ReturnType<typeof businessStatus> }) {
  if (status === 'suspended') {
    return (
      <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase bg-error-container text-on-error-container flex items-center w-fit gap-1">
        Suspended
      </span>
    );
  }
  if (status === 'trial') {
    return (
      <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase bg-secondary-fixed/30 text-on-secondary-fixed-variant flex items-center w-fit gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-on-secondary-fixed-variant animate-pulse" />
        Trial
      </span>
    );
  }
  if (status === 'expired') {
    return (
      <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase bg-error-container text-on-error-container flex items-center w-fit gap-1">
        Expired
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded-md text-[11px] font-bold uppercase bg-tertiary-fixed/30 text-on-tertiary-fixed-variant flex items-center w-fit gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-fixed-variant" />
      Active
    </span>
  );
}

function formatCreatedDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export default function PlatformBusinessesPage() {
  const { data: businesses = [], isLoading } = usePlatformBusinesses();
  const { data: metrics } = usePlatformMetrics();
  const createBusiness = useCreateBusiness();
  const suspend = useSuspendBusiness();
  const reactivate = useReactivateBusiness();
  const updateSubscription = useUpdateBusinessSubscription();
  const setTrialDays = useSetBusinessTrialDays();
  const blockSubscription = useBlockBusinessSubscription();
  const unblockSubscription = useUnblockBusinessSubscription();
  const deleteBusiness = useDeleteBusiness();
  const toast = useToast();

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState('');
  const [createTheme, setCreateTheme] = useState<ThemeEditorValue>({
    primaryColor: DEFAULT_BUSINESS_THEME.primaryColor,
    secondaryColor: DEFAULT_BUSINESS_THEME.secondaryColor,
    backgroundColor: DEFAULT_BUSINESS_THEME.backgroundColor,
    textColor: DEFAULT_BUSINESS_THEME.textColor,
  });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [subscriptionDraft, setSubscriptionDraft] = useState('TRIAL');
  const [trialDaysDraft, setTrialDaysDraft] = useState('14');
  const pageSize = 25;

  const { data: detailBusiness, isLoading: detailLoading } = usePlatformBusiness(detailId);

  const filtered = useMemo(() => {
    return businesses.filter((b) => platformBusinessMatchesFilter(b, filter));
  }, [businesses, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const trialCount = businesses.filter((b) => businessStatus(b) === 'trial').length;
  const suspendedCount = businesses.filter((b) => b.isSuspended).length;
  const total = metrics?.totalBusinesses ?? businesses.length;
  const activeCount = metrics?.activeBusinesses ?? 0;
  const totalOrders = metrics?.totalOrders ?? 0;
  const avgOrders =
    businesses.length > 0
      ? Math.round(businesses.reduce((s, b) => s + b.orderCount, 0) / businesses.length)
      : 0;

  function openDetail(b: PlatformBusiness) {
    setDetailId(b.id);
    setSubscriptionDraft(b.subscriptionStatus);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    try {
      if (!isThemeValid(createTheme)) {
        setCreateError('Please enter valid hex colors for the store theme.');
        return;
      }

      await createBusiness.mutateAsync({
        businessName: createForm.businessName.trim(),
        businessSlug: slugify(createForm.businessSlug),
        ownerName: createForm.ownerName.trim(),
        ownerEmail: createForm.ownerEmail.trim(),
        ownerPassword: createForm.ownerPassword,
        subscriptionStatus: createForm.subscriptionStatus,
        trialDays:
          createForm.subscriptionStatus === 'TRIAL'
            ? Number(createForm.trialDays) || 14
            : undefined,
        ...normalizeTheme(createTheme),
      });
      toast.success('Tenant provisioned successfully');
      setCreateForm(emptyCreateForm);
      setCreateTheme({
        primaryColor: DEFAULT_BUSINESS_THEME.primaryColor,
        secondaryColor: DEFAULT_BUSINESS_THEME.secondaryColor,
        backgroundColor: DEFAULT_BUSINESS_THEME.backgroundColor,
        textColor: DEFAULT_BUSINESS_THEME.textColor,
      });
      setCreateOpen(false);
    } catch (err) {
      const msg = formatApiError(err);
      setCreateError(msg);
      toast.error(msg);
    }
  }

  async function handleSuspend(id: string) {
    try {
      await suspend.mutateAsync(id);
      toast.success('Business suspended');
    } catch (e) {
      toast.error(formatApiError(e));
    }
  }

  async function handleReactivate(id: string) {
    try {
      await reactivate.mutateAsync(id);
      toast.success('Business access restored');
    } catch (e) {
      toast.error(formatApiError(e));
    }
  }

  async function handleSubscriptionSave() {
    if (!detailId) return;
    try {
      await updateSubscription.mutateAsync({
        id: detailId,
        subscriptionStatus: subscriptionDraft as 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIAL',
      });
      toast.success('Subscription updated');
    } catch (e) {
      toast.error(formatApiError(e));
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteBusiness.mutateAsync(deleteId);
      toast.success('Business deleted');
      setDeleteId(null);
      if (detailId === deleteId) setDetailId(null);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  }

  return (
    <PlatformLayout hideHeaderTitle>
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary tracking-tight">Tenants</h2>
          <p className="text-on-surface-variant mt-1">
            Monitor and manage all business instances across the {APP_NAME} network.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-body-emphasis hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Icon name="add" className="text-[20px]" />
            New Tenant
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">
          <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
            Total Tenants
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display-md text-primary">{total.toLocaleString()}</span>
            <span className="text-on-tertiary-container font-caption">{activeCount} active</span>
          </div>
        </div>
        <div className="p-4 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">
          <p className="font-caption text-on-surface-variant uppercase tracking-wider">Active Trials</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display-md text-primary">{trialCount}</span>
            <span className="text-secondary font-caption">
              {suspendedCount > 0 ? `${suspendedCount} suspended` : 'none suspended'}
            </span>
          </div>
        </div>
        <div className="p-4 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">
          <p className="font-caption text-on-surface-variant uppercase tracking-wider">
            Avg. Orders / Shop
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display-md text-primary">
              {avgOrders >= 1000 ? `${(avgOrders / 1000).toFixed(1)}k` : avgOrders}
            </span>
            <span className="text-on-surface-variant font-caption">lifetime avg</span>
          </div>
        </div>
        <div className="p-4 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">
          <p className="font-caption text-on-surface-variant uppercase tracking-wider">Total Orders</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display-md text-primary">{totalOrders.toLocaleString()}</span>
            <span className="text-on-tertiary-container font-caption">platform-wide</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden flex flex-col flex-1 shadow-sm min-h-[480px]">
        <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-lowest/50">
          <div className="flex gap-1 border border-outline-variant/30 rounded-lg p-0.5 bg-surface-container-low">
            {(
              [
                'all',
                'active',
                'trial',
                'expiring',
                'expired',
                'grace',
                'read_only',
                'locked',
                'suspended',
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setFilter(tab);
                  setPage(0);
                }}
                className={`px-3 py-1 text-caption rounded-md transition-colors cursor-pointer capitalize whitespace-nowrap ${
                  filter === tab
                    ? 'font-body-emphasis bg-white shadow-sm text-primary'
                    : 'font-body-base text-on-surface-variant hover:text-primary'
                }`}
              >
                {tab === 'all'
                  ? 'All'
                  : tab === 'read_only'
                    ? 'Read-only'
                    : tab.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <div className="text-on-surface-variant font-caption text-caption">
            Showing {pageItems.length} of {filtered.length.toLocaleString()} businesses
          </div>
        </div>

        <div className="overflow-x-auto flex-1 platform-custom-scrollbar">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={8} cols={9} />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/30 border-b border-outline-variant/20">
                  <th className="px-6 py-3 font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    Business Name
                  </th>
                  <th className="px-6 py-3 font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    Owner email
                  </th>
                  <th className="px-6 py-3 font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    Access
                  </th>
                  <th className="px-6 py-3 font-caption text-caption text-on-surface-variant uppercase tracking-wider text-right">
                    Users
                  </th>
                  <th className="px-6 py-3 font-caption text-caption text-on-surface-variant uppercase tracking-wider text-right">
                    Orders
                  </th>
                  <th className="px-6 py-3 font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 font-caption text-caption text-on-surface-variant uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {pageItems.map((b) => {
                  const status = businessStatus(b);
                  const icon = businessIcon(b.name, b.isSuspended);

                  return (
                    <tr key={b.id} className="group hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              b.isSuspended
                                ? 'bg-error-container/20 text-error'
                                : 'bg-secondary-container/20 text-secondary'
                            }`}
                          >
                            <Icon name={icon} className="text-[16px]" />
                          </div>
                          <span className="font-body-emphasis text-on-surface">{b.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-caption text-on-surface-variant">/{b.slug}</td>
                      <td className="px-6 py-4 font-body-base text-on-surface-variant">
                        {b.ownerEmail ? (
                          <a href={`mailto:${b.ownerEmail}`} className="hover:text-primary hover:underline">
                            {b.ownerEmail}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-6 py-4 font-caption text-on-surface-variant">
                        {adminSubscriptionAccessLabel(b)}
                      </td>
                      <td className="px-6 py-4 text-right font-body-base">{b.userCount}</td>
                      <td className="px-6 py-4 text-right font-body-base">{b.orderCount.toLocaleString()}</td>
                      <td className="px-6 py-4 font-body-base text-on-surface-variant">
                        {formatCreatedDate(b.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="platform-row-actions opacity-0 transition-opacity flex justify-end gap-1">
                          <IconButton
                            title="View Details"
                            onClick={() => openDetail(b)}
                            className="hover:bg-surface-container-high text-on-surface-variant"
                          >
                            <Icon name="visibility" className="text-[18px]" />
                          </IconButton>
                          {b.isSuspended ? (
                            <IconButton
                              title="Restore Access"
                              loading={reactivate.isPending}
                              onClick={() => handleReactivate(b.id)}
                              className="hover:bg-tertiary-fixed/30 hover:text-on-tertiary-fixed-variant text-on-surface-variant"
                            >
                              <Icon name="restore" className="text-[18px]" />
                            </IconButton>
                          ) : (
                            <IconButton
                              title="Suspend"
                              loading={suspend.isPending}
                              onClick={() => handleSuspend(b.id)}
                              className="hover:bg-error-container hover:text-error text-on-surface-variant"
                            >
                              <Icon name="block" className="text-[18px]" />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center font-caption text-on-surface-variant">
                      No businesses match this filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between bg-surface-container-low/20">
          <div className="text-on-surface-variant font-caption text-caption">
            Page {page + 1} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1 border border-outline-variant/30 rounded text-caption font-body-emphasis hover:bg-surface-container-high disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-primary text-on-primary rounded text-caption font-body-emphasis hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateError('');
          setCreateForm(emptyCreateForm);
        }}
        title="Provision new tenant"
        description="Create a business and owner account. The owner can log in at the staff login page."
        size="lg"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="create-tenant-form"
              loading={createBusiness.isPending}
            >
              Create tenant
            </Button>
          </>
        }
      >
        <form id="create-tenant-form" onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Business name"
            value={createForm.businessName}
            onChange={(e) => setCreateForm((f) => ({ ...f, businessName: e.target.value }))}
            required
            autoFocus
          />
          <Input
            label="Business slug"
            value={createForm.businessSlug}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, businessSlug: sanitizeSlugInput(e.target.value) }))
            }
            placeholder="my-cafe"
            required
          />
          <Input
            label="Owner name"
            value={createForm.ownerName}
            onChange={(e) => setCreateForm((f) => ({ ...f, ownerName: e.target.value }))}
            required
          />
          <Input
            label="Owner email"
            type="email"
            value={createForm.ownerEmail}
            onChange={(e) => setCreateForm((f) => ({ ...f, ownerEmail: e.target.value }))}
            required
          />
          <Input
            label="Owner password"
            type="password"
            value={createForm.ownerPassword}
            onChange={(e) => setCreateForm((f) => ({ ...f, ownerPassword: e.target.value }))}
            required
            minLength={8}
          />
          <SelectField
            label="Subscription"
            value={createForm.subscriptionStatus}
            onChange={(e) =>
              setCreateForm((f) => ({
                ...f,
                subscriptionStatus: e.target.value as typeof f.subscriptionStatus,
              }))
            }
            options={[
              { value: 'TRIAL', label: 'Trial' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'PAST_DUE', label: 'Past due' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
          {createForm.subscriptionStatus === 'TRIAL' && (
            <Input
              label="Trial days"
              type="number"
              min={1}
              max={365}
              value={createForm.trialDays}
              onChange={(e) => setCreateForm((f) => ({ ...f, trialDays: e.target.value }))}
            />
          )}
          <div className="pt-2 border-t border-outline-variant/20">
            <p className="font-body-emphasis mb-3">Store theme</p>
            <ThemeEditor value={createTheme} onChange={setCreateTheme} compact />
          </div>
          {createError && <p className="font-caption text-error">{createError}</p>}
        </form>
      </Modal>

      <Modal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        title={detailBusiness?.name ?? 'Tenant details'}
        description={detailBusiness ? `/${detailBusiness.slug}` : undefined}
        size="lg"
        footer={
          detailBusiness ? (
            <>
              <Button
                variant="ghost"
                type="button"
                className="text-error mr-auto"
                onClick={() => setDeleteId(detailBusiness.id)}
              >
                Delete tenant
              </Button>
              <Button variant="ghost" type="button" onClick={() => setDetailId(null)}>
                Close
              </Button>
              {detailBusiness.isSuspended ? (
                <Button
                  variant="primary"
                  type="button"
                  loading={reactivate.isPending}
                  onClick={() => handleReactivate(detailBusiness.id)}
                >
                  Reactivate
                </Button>
              ) : (
                <Button
                  variant="outline"
                  type="button"
                  loading={suspend.isPending}
                  onClick={() => handleSuspend(detailBusiness.id)}
                >
                  Suspend
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {detailLoading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
        {detailBusiness && !detailLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Owner</p>
                <p className="font-body-emphasis">{detailBusiness.ownerName ?? '—'}</p>
                {detailBusiness.ownerEmail && (
                  <a
                    href={`mailto:${detailBusiness.ownerEmail}`}
                    className="font-caption text-secondary hover:underline"
                  >
                    {detailBusiness.ownerEmail}
                  </a>
                )}
              </div>
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Users</p>
                <p className="font-display-md text-primary">{detailBusiness.userCount}</p>
              </div>
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Orders</p>
                <p className="font-display-md text-primary">{detailBusiness.orderCount}</p>
              </div>
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Created</p>
                <p className="font-body-emphasis">{formatCreatedDate(detailBusiness.createdAt)}</p>
              </div>
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Status</p>
                <StatusBadge status={businessStatus(detailBusiness)} />
              </div>
              <div>
                <p className="font-caption text-on-surface-variant uppercase">Access remaining</p>
                <p className="font-body-emphasis">
                  {adminSubscriptionAccessLabel(detailBusiness)}
                </p>
                {getSubscriptionPeriodEnd(detailBusiness) && (
                  <p className="font-caption text-on-surface-variant mt-0.5">
                    Ends {getSubscriptionPeriodEnd(detailBusiness)!.toLocaleDateString()}
                    {getSubscriptionDaysRemaining(detailBusiness) != null
                      ? ` (${getSubscriptionDaysRemaining(detailBusiness)} days)`
                      : ''}
                  </p>
                )}
              </div>
              {detailBusiness.trialEndsAt && (
                <div>
                  <p className="font-caption text-on-surface-variant uppercase">Trial ends</p>
                  <p className="font-body-emphasis">
                    {new Date(detailBusiness.trialEndsAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {detailBusiness.subscriptionEndsAt && (
                <div>
                  <p className="font-caption text-on-surface-variant uppercase">Subscription ends</p>
                  <p className="font-body-emphasis">
                    {new Date(detailBusiness.subscriptionEndsAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            <RenewSubscriptionPanel business={detailBusiness} />
            <div className="flex gap-3 items-end">
              <Input
                label="Reset trial period (days)"
                type="number"
                min={1}
                max={365}
                value={trialDaysDraft}
                onChange={(e) => setTrialDaysDraft(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                type="button"
                loading={setTrialDays.isPending}
                onClick={async () => {
                  if (!detailBusiness) return;
                  try {
                    await setTrialDays.mutateAsync({
                      id: detailBusiness.id,
                      trialDays: Number(trialDaysDraft) || 14,
                    });
                    toast.success('Trial period updated');
                  } catch (err) {
                    toast.error(formatApiError(err));
                  }
                }}
              >
                Set trial
              </Button>
            </div>
            <div className="flex gap-3 items-end">
              <SelectField
                label="Subscription status"
                value={subscriptionDraft}
                onChange={(e) => setSubscriptionDraft(e.target.value)}
                options={[
                  { value: 'TRIAL', label: 'Trial' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'PAST_DUE', label: 'Past due' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
                className="flex-1"
              />
              <Button
                variant="secondary"
                type="button"
                loading={updateSubscription.isPending}
                disabled={subscriptionDraft === detailBusiness.subscriptionStatus}
                onClick={handleSubscriptionSave}
              >
                Update
              </Button>
            </div>
            <SendSubscriptionInvoicePanel business={detailBusiness} />
            <div className="rounded-xl border border-outline-variant/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-body-emphasis text-primary">Subscription access</p>
                  <p className="font-caption text-on-surface-variant">
                    {detailBusiness.isSubscriptionBlocked
                      ? 'Tenant is blocked — they see the lock screen immediately.'
                      : 'Tenant can use the app based on trial or paid subscription.'}
                  </p>
                </div>
                {detailBusiness.isSubscriptionBlocked ? (
                  <span className="font-caption uppercase px-2 py-1 rounded-full bg-error-container text-on-error-container">
                    Blocked
                  </span>
                ) : (
                  <span className="font-caption uppercase px-2 py-1 rounded-full bg-tertiary-container text-on-tertiary-container">
                    Allowed
                  </span>
                )}
              </div>
              {detailBusiness.isSubscriptionBlocked ? (
                <Button
                  variant="primary"
                  type="button"
                  loading={unblockSubscription.isPending}
                  onClick={async () => {
                    try {
                      await unblockSubscription.mutateAsync(detailBusiness.id);
                      toast.success('Subscription access restored');
                    } catch (err) {
                      toast.error(formatApiError(err));
                    }
                  }}
                  className="cursor-pointer"
                >
                  Unblock subscription
                </Button>
              ) : (
                <Button
                  variant="outline"
                  type="button"
                  loading={blockSubscription.isPending}
                  onClick={async () => {
                    try {
                      await blockSubscription.mutateAsync(detailBusiness.id);
                      toast.success('Subscription blocked — tenant locked immediately');
                    } catch (err) {
                      toast.error(formatApiError(err));
                    }
                  }}
                  className="cursor-pointer text-error border-error/40"
                >
                  Block subscription now
                </Button>
              )}
            </div>
            {detailBusiness.primaryColor && (
              <p className="font-caption text-on-surface-variant">
                Brand color: {detailBusiness.primaryColor}
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete tenant"
        message="This permanently deletes the business and all associated data. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteBusiness.isPending}
      />
    </PlatformLayout>
  );
}
