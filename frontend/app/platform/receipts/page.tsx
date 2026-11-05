'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  DEFAULT_RECEIPT_TEMPLATE,
  mergeReceiptTemplate,
  type ReceiptTemplate,
  type ReceiptTemplateOverride,
} from '@/lib/receipt/receipt-template';
import type { ReceiptTemplateLabels } from '@/lib/receipt/receipt-format';
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
  const defaultDirtyRef = useRef(false);
  const tenantDirtyRef = useRef(false);

  useEffect(() => {
    if (platformTemplate && !defaultDirtyRef.current) {
      setDefaultTemplate(mergeReceiptTemplate(platformTemplate, null));
    }
  }, [platformTemplate]);

  useEffect(() => {
    if (!selectedBusinessId && businesses[0]?.id) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  useEffect(() => {
    tenantDirtyRef.current = false;
  }, [selectedBusinessId]);

  useEffect(() => {
    if (tenantBundle && !tenantDirtyRef.current) {
      setTenantTemplate(mergeReceiptTemplate(tenantBundle.resolved, null));
    }
  }, [tenantBundle]);

  const previewTemplate = tab === 'default' ? defaultTemplate : tenantTemplate;
  const previewKey = useMemo(() => JSON.stringify(previewTemplate), [previewTemplate]);

  const previewHtml = useMemo(() => {
    const template = previewTemplate;
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
  }, [previewTemplate, businesses, selectedBusinessId]);

  async function saveDefault() {
    try {
      const { template } = await updateDefault.mutateAsync(
        mergeReceiptTemplate(DEFAULT_RECEIPT_TEMPLATE, defaultTemplate),
      );
      defaultDirtyRef.current = false;
      setDefaultTemplate(mergeReceiptTemplate(template, null));
      toast.success('Default receipt saved');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function saveTenantOverride() {
    if (!selectedBusinessId || !tenantBundle) return;
    const platform = mergeReceiptTemplate(tenantBundle.platformTemplate, null);
    const override = diffOverride(platform, tenantTemplate);
    try {
      const bundle = await updateTenant.mutateAsync(
        Object.keys(override).length ? override : null,
      );
      tenantDirtyRef.current = false;
      setTenantTemplate(mergeReceiptTemplate(bundle.resolved, null));
      toast.success('Tenant receipt override saved');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function clearTenantOverride() {
    if (!selectedBusinessId) return;
    try {
      const bundle = await updateTenant.mutateAsync(null);
      tenantDirtyRef.current = false;
      setTenantTemplate(mergeReceiptTemplate(bundle.resolved, null));
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
              onChange={(next) => {
                if (tab === 'default') {
                  defaultDirtyRef.current = true;
                  setDefaultTemplate(next);
                } else {
                  tenantDirtyRef.current = true;
                  setTenantTemplate(next);
                }
              }}
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
                key={previewKey}
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

function diffLabels(
  platform: ReceiptTemplateLabels,
  resolved: ReceiptTemplateLabels,
): Partial<ReceiptTemplateLabels> {
  const out: Partial<ReceiptTemplateLabels> = {};
  for (const key of Object.keys(platform) as (keyof ReceiptTemplateLabels)[]) {
    if (platform[key] !== resolved[key]) out[key] = resolved[key];
  }
  return out;
}

function diffOverride(platform: ReceiptTemplate, resolved: ReceiptTemplate): ReceiptTemplateOverride {
  const override: ReceiptTemplateOverride = {};
  for (const key of Object.keys(resolved) as (keyof ReceiptTemplate)[]) {
    if (key === 'labels') {
      const labelDiff = diffLabels(platform.labels, resolved.labels);
      if (Object.keys(labelDiff).length > 0) override.labels = labelDiff;
      continue;
    }
    if (key === 'customBlocks') {
      if (JSON.stringify(platform.customBlocks) !== JSON.stringify(resolved.customBlocks)) {
        override.customBlocks = resolved.customBlocks;
      }
      continue;
    }
    if (platform[key] !== resolved[key]) {
      (override as Record<string, unknown>)[key] = resolved[key];
    }
  }
  return override;
}
