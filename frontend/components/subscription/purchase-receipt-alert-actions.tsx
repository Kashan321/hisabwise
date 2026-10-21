'use client';

import { Button, Icon } from '@/components/ui';
import type { SubscriptionInvoiceAlert } from '@/lib/api/types';
import { DismissInvoiceAlertButton } from '@/components/subscription/dismiss-invoice-alert-button';

export function PurchaseReceiptAlertActions({ receipt }: { receipt: SubscriptionInvoiceAlert }) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
      <a href={receipt.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-initial">
        <Button variant="secondary" className="w-full sm:w-auto">
          <Icon name="picture_as_pdf" className="text-base" />
          Download invoice
        </Button>
      </a>
      <DismissInvoiceAlertButton
        invoiceId={receipt.id}
        label="Hide notice"
        className="flex-1 sm:flex-initial w-full sm:w-auto"
      />
    </div>
  );
}
