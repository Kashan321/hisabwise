'use client';

import { Modal } from '@/components/ui/modal';
import { Icon } from '@/components/ui';

export type PrintBillPromptContext = 'order-placed' | 'order-completed' | 'order-delivered';

const COPY: Record<PrintBillPromptContext, { title: string; message: string }> = {
  'order-placed': {
    title: 'Print bill?',
    message: 'This order was just placed. Would you like to print the bill now?',
  },
  'order-completed': {
    title: 'Print bill?',
    message: 'This order is completed. Would you like to print the final bill?',
  },
  'order-delivered': {
    title: 'Print bill?',
    message: 'This order has been delivered. Would you like to print the bill?',
  },
};

export function PrintBillPromptDialog({
  open,
  context,
  onPrint,
  onSkip,
  onAddMore,
}: {
  open: boolean;
  context: PrintBillPromptContext;
  onPrint: () => void;
  onSkip: () => void;
  onAddMore?: () => void;
}) {
  const copy = COPY[context];

  return (
    <Modal
      open={open}
      onClose={onSkip}
      title={copy.title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2.5 rounded-lg font-body-emphasis text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            {onAddMore ? 'Done' : 'Not now'}
          </button>
          {onAddMore && (
            <button
              type="button"
              onClick={onAddMore}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-body-emphasis border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
            >
              <Icon name="add" className="text-lg" />
              Add more items
            </button>
          )}
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-body-emphasis bg-primary text-on-primary hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <Icon name="print" className="text-lg" />
            Print bill
          </button>
        </>
      }
    >
      <p className="font-body-base text-on-surface-variant">{copy.message}</p>
    </Modal>
  );
}
