'use client';

import { Button, Icon } from '@/components/ui';
import { formatApiError } from '@/lib/api/errors';
import { useDismissSubscriptionInvoiceAlert } from '@/lib/hooks/mutations';
import { useToast } from '@/lib/toast';

export function DismissInvoiceAlertButton({
  invoiceId,
  label = 'Hide notice',
  className = '',
}: {
  invoiceId: string;
  label?: string;
  className?: string;
}) {
  const toast = useToast();
  const dismiss = useDismissSubscriptionInvoiceAlert();

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      loading={dismiss.isPending}
      onClick={async () => {
        try {
          const result = await dismiss.mutateAsync(invoiceId);
          toast.success(
            result.localOnly
              ? 'Reminder hidden on this device. Deploy the latest backend to clear it for all users.'
              : 'Reminder hidden — download anytime from Subscription',
          );
        } catch (err) {
          toast.error(formatApiError(err));
        }
      }}
    >
      <Icon name="close" className="text-base" />
      {label}
    </Button>
  );
}
