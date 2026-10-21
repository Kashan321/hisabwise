'use client';

import Link from 'next/link';
import { use, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Icon, Spinner } from '@/components/ui';
import { clearOrderSession } from '@/lib/cart-storage';
import { usePublicMenu, usePublicOrder } from '@/lib/hooks/queries';
import { formatCurrency } from '@/lib/format-currency';
import { themeToStyle } from '@/lib/theme/theme-css';
import { printOrderReceipt } from '@/lib/print-order-receipt';
import { APP_NAME } from '@/lib/config';
import { useToast } from '@/lib/toast';
import { formatOrderLabel } from '@/lib/order-display';

function ConfirmContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';
  const toast = useToast();
  const { data: menuData } = usePublicMenu(slug);
  const { data: orderData, isLoading } = usePublicOrder(slug, orderId, true);
  const order = orderData?.order;
  const business = orderData?.business ?? menuData?.business;
  const receiptTemplate = orderData?.receiptTemplate ?? menuData?.receiptTemplate;
  const branchName = business?.name ?? menuData?.business?.name ?? APP_NAME;
  const currency = business?.currency ?? undefined;
  const formatMoney = (amount: number | string | null | undefined) =>
    formatCurrency(amount, currency);

  const status = order?.status ?? 'RECEIVED';
  const step = status === 'RECEIVED' ? 1 : status === 'PREPARING' ? 2 : status === 'READY' ? 3 : 3;

  if (!orderId) {
    return (
      <div className="text-center py-16">
        <p className="font-body-base text-on-surface-variant">No order found.</p>
        <Link href={`/${slug}/order`} className="text-secondary mt-4 inline-block">
          Back to menu
        </Link>
      </div>
    );
  }

  if (isLoading && !order) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8 text-secondary" />
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-12">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-tertiary-fixed flex items-center justify-center animate-success-pop">
            <Icon name="check_circle" filled className="text-[48px] text-on-tertiary-container" />
          </div>
        </div>
        <h1 className="font-display-lg text-primary mb-2">Order Received</h1>
        <p className="font-body-emphasis text-on-surface-variant">
          Order <span className="font-mono">{formatOrderLabel(order ?? orderId)}</span>
        </p>
        {order && (
          <p className="font-caption text-secondary mt-1 capitalize">{order.status.toLowerCase()}</p>
        )}
      </div>

      <div className="w-full mb-12 relative px-4">
        <div className="absolute top-5 left-8 right-8 h-[2px] bg-outline-variant/30 -z-10" />
        <div
          className="absolute top-5 left-8 h-[2px] bg-secondary -z-10 transition-all"
          style={{ width: `${(step / 3) * 66}%` }}
        />
        <div className="flex justify-between items-start">
          {[
            { icon: 'receipt_long', label: 'Received', active: step >= 1 },
            { icon: 'skillet', label: 'Preparing', active: step >= 2 },
            { icon: 'local_cafe', label: 'Ready', active: step >= 3 },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-background ${
                  s.active
                    ? 'bg-secondary text-on-secondary'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <Icon name={s.icon} className="text-[20px]" />
              </div>
              <span
                className={`font-body-emphasis ${s.active ? 'text-primary' : 'text-on-surface-variant'}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {order && (
        <div className="w-full border border-outline-variant/30 rounded-xl p-8 bg-surface-bright shadow-sm mb-4">
          <h3 className="font-title-lg text-primary border-b border-outline-variant/20 pb-4 mb-4">
            Order Details
          </h3>
          <ul className="space-y-3 mb-6">
            {order.items?.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 font-body-base">
                <div className="min-w-0">
                  <span className="block">
                    {item.quantity}x {item.menuItemName}
                  </span>
                  {item.variantName && (
                    <span className="block font-caption text-on-surface-variant">
                      {item.variantName}
                    </span>
                  )}
                  {(item.modifiers ?? []).map((mod) => (
                    <span
                      key={mod.id ?? mod.modifierName}
                      className="block font-caption text-on-surface-variant"
                    >
                      {mod.modifierName}
                    </span>
                  ))}
                </div>
                <span className="font-mono shrink-0">{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-title-lg text-primary pt-4 border-t border-dashed border-outline-variant/40">
            <span>Total</span>
            <span className="font-mono">{formatMoney(order.totalAmount)}</span>
          </div>
        </div>
      )}

      <div className="w-full flex flex-col sm:flex-row gap-4">
        <Button
          type="button"
          variant="primary"
          className="flex-1 py-4"
          disabled={!order}
          onClick={() => {
            if (!order) return;
            try {
              printOrderReceipt(order, {
                tableLabel: 'QR Order',
                businessName: business?.name ?? branchName,
                businessLocation: business?.location,
                businessPhone: business?.phone,
                businessLogoUrl: business?.logoUrl,
                copyType: 'customer',
                currency,
                receiptTemplate,
              });
              toast.success('Receipt opened');
            } catch (err) {
              toast.error('Could not open print dialog');
            }
          }}
        >
          <Icon name="receipt" />
          View Digital Receipt
        </Button>
      </div>

      <div className="mt-12 text-center">
        <Link
          href={`/${slug}/order`}
          onClick={() => clearOrderSession(slug)}
          className="text-secondary font-body-emphasis hover:underline underline-offset-4 decoration-2 cursor-pointer"
        >
          Order something else?
        </Link>
      </div>
    </>
  );
}

export default function OrderConfirmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: menuData } = usePublicMenu(slug);

  return (
    <div
      className="bg-background text-on-surface font-body-base min-h-screen flex flex-col items-center relative"
      style={themeToStyle(menuData?.business)}
    >
      <div className="fixed inset-0 -z-20 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full" />
      </div>

      <header className="w-full h-16 flex items-center px-margin-mobile md:px-margin-desktop sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10">
        <span className="font-display-md text-secondary">{slug.replace(/-/g, ' ')}</span>
      </header>

      <main className="max-w-2xl w-full px-margin-mobile py-12 flex flex-col items-center">
        <Suspense
          fallback={
            <div className="py-16">
              <Spinner className="h-8 w-8 text-secondary mx-auto" />
            </div>
          }
        >
          <ConfirmContent slug={slug} />
        </Suspense>
      </main>
    </div>
  );
}
