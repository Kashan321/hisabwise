'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import { ReceiptTemplateEditor } from '@/components/receipt/receipt-template-editor';
import { Button, SelectField, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import {
  useUpdateBusinessReceiptTemplate,
  useUpdatePlatformReceiptTemplate,
} from '@/lib/hooks/mutations';
import {
  usePlatformBusinesses,
  usePlatformBusinessReceiptTemplate,
  usePlatformReceiptTemplate,
} from '@/lib/hooks/queries';
import { DEFAULT_RECEIPT_TEMPLATE, type ReceiptTemplate } from '@/lib/receipt/receipt-template';
import { SAMPLE_RECEIPT_ORDER } from '@/lib/receipt/sample-order';
import { receiptPrintPhoneOptions } from '@/lib/business-phones';
import { renderOrderReceiptHtml } from '@/lib/print-order-receipt';
import { useToast } from '@/lib/toast';

type Tab = 'default' | 'tenant';

export default function PlatformReceiptsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('default');
  const [defaultTemplate, setDefaultTemplate] = useState<ReceiptTemplate>(DEFAULT_RECEIPT_TEMPLATE);
  const [tenantTemplate, setTenantTemplate] = useState<ReceiptTemplate>(DEFAULT_RECEIPT_TEMPLATE);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');

  const { data: platformTemplate, isLoading: defaultLoading } = usePlatformReceiptTemplate();
  const { data: businesses = [], isLoading: businessesLoading } = usePlatformBusinesses();
  const { data: tenantBundle, isLoading: tenantLoading } =
    usePlatformBusinessReceiptTemplate(selectedBusinessId);

  const updateDefault = useUpdatePlatformReceiptTemplate();
  const updateTenant = useUpdateBusinessReceiptTemplate(selectedBusinessId);

  useEffect(() => {
    if (platformTemplate) setDefaultTemplate(platformTemplate);
  }, [platformTemplate]);

  useEffect(() => {
    if (!selectedBusinessId && businesses[0]?.id) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  useEffect(() => {
    if (tenantBundle) setTenantTemplate(tenantBundle.resolved);
  }, [tenantBundle]);

  const previewHtml = useMemo(() => {
    const template = tab === 'default' ? defaultTemplate : tenantTemplate;
    const business = businesses.find((b) => b.id === selectedBusinessId);
    return renderOrderReceiptHtml(SAMPLE_RECEIPT_ORDER, {
      tableLabel: 'Table 5',
      businessName: business?.name ?? 'Sample Restaurant',
      businessLocation: business?.location ?? 'Model town st 4',
      ...receiptPrintPhoneOptions({
        phone: '03256955674',
        phoneSecondary: '0211234567',
      }),
      businessLogoUrl: business?.logoUrl ?? null,
      copyType: 'customer',
      currency: 'PKR',
      receiptTemplate: template,
    });
  }, [tab, defaultTemplate, tenantTemplate, businesses, selectedBusinessId]);

  async function saveDefault() {
    try {
      await updateDefault.mutateAsync(defaultTemplate);
      toast.success('Default receipt saved');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function saveTenantOverride() {
    if (!selectedBusinessId || !tenantBundle) return;
    const override = diffOverride(tenantBundle.platformTemplate, tenantTemplate);
    try {
      await updateTenant.mutateAsync(Object.keys(override).length ? override : null);
      toast.success('Tenant receipt override saved');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function clearTenantOverride() {
    if (!selectedBusinessId) return;
    try {
      await updateTenant.mutateAsync(null);
      toast.success('Tenant override cleared — using default receipt');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  const loading = defaultLoading || businessesLoading || (tab === 'tenant' && tenantLoading);

  return (
    <PlatformLayout title="Receipts">
      <PageHeader
        title="Receipt settings"
        description="Edit the default receipt for all tenants, or customize it for a specific business."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          type="button"
          variant={tab === 'default' ? 'primary' : 'outline'}
          onClick={() => setTab('default')}
        >
          Default receipt
        </Button>
        <Button
          type="button"
          variant={tab === 'tenant' ? 'primary' : 'outline'}
          onClick={() => setTab('tenant')}
        >
          Tenant override
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-outline-variant/15 bg-white p-6 shadow-sm space-y-5">
            {tab === 'tenant' && (
              <SelectField
                label="Tenant"
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                options={businesses.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.slug})`,
                }))}
              />
            )}

            {tab === 'default' ? (
              <p className="font-caption text-on-surface-variant">
                This is the receipt layout used by all tenants unless a tenant has a custom override.
              </p>
            ) : (
              <p className="font-caption text-on-surface-variant">
                Customize receipt text and options for this tenant only. Clear override to use the
                default receipt.
              </p>
            )}

            <ReceiptTemplateEditor
              value={tab === 'default' ? defaultTemplate : tenantTemplate}
              onChange={tab === 'default' ? setDefaultTemplate : setTenantTemplate}
            />

            <div className="flex flex-wrap gap-3">
              {tab === 'default' ? (
                <Button
                  type="button"
                  variant="primary"
                  loading={updateDefault.isPending}
                  onClick={() => void saveDefault()}
                >
                  Save default receipt
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    loading={updateTenant.isPending}
                    disabled={!selectedBusinessId}
                    onClick={() => void saveTenantOverride()}
                  >
                    Save tenant override
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    loading={updateTenant.isPending}
                    disabled={!selectedBusinessId || !tenantBundle?.override}
                    onClick={() => void clearTenantOverride()}
                  >
                    Use default receipt
                  </Button>
                </>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-4 shadow-sm">
            <h3 className="font-title-lg text-primary mb-3">Live preview</h3>
            <div className="overflow-auto rounded-xl border border-outline-variant/20 bg-white p-2 max-h-[80vh]">
              <iframe
                title="Receipt preview"
                srcDoc={previewHtml}
                className="w-full min-h-[720px] border-0 bg-white"
              />
            </div>
          </section>
        </div>
      )}
    </PlatformLayout>
  );
}

function diffOverride(platform: ReceiptTemplate, resolved: ReceiptTemplate): Partial<ReceiptTemplate> {
  const entries = Object.entries(resolved).filter(
    ([key, value]) => platform[key as keyof ReceiptTemplate] !== value,
  );
  return Object.fromEntries(entries) as Partial<ReceiptTemplate>;
}
