'use client';

import { useCallback, useRef, useState } from 'react';
import {
  PrintBillPromptDialog,
  type PrintBillPromptContext,
} from '@/components/orders/print-bill-prompt-dialog';
import type { Order } from '@/lib/api/types';
import { printOrderReceipt } from '@/lib/print-order-receipt';
import { useReceiptTemplate } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';
import { formatApiError } from '@/lib/api/errors';
import { formatOrderLabel } from '@/lib/order-display';

type PromptState = {
  order: Order;
  context: PrintBillPromptContext;
  onDone?: () => void;
  onAddMore?: () => void;
};

export function usePrintBillPrompt(options: {
  businessName?: string;
  businessLocation?: string | null;
  businessPhone?: string | null;
  businessPhoneSecondary?: string | null;
  businessLogoUrl?: string | null;
  currency?: string;
  getTableLabel?: (order: Order) => string;
}) {
  const toast = useToast();
  const { data: receiptTemplate } = useReceiptTemplate();
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const isPrintingRef = useRef(false);

  const closePrompt = useCallback(() => {
    if (!prompt) return;
    const onDone = prompt.onDone;
    setPrompt(null);
    onDone?.();
  }, [prompt]);

  const printCustomerBill = useCallback(
    (order: Order) => {
      if (isPrintingRef.current) return;
      isPrintingRef.current = true;
      try {
        const tableLabel =
          options.getTableLabel?.(order) ??
          order.tableIdentifier ??
          (order.tableId ? 'Table' : '—');
        printOrderReceipt(order, {
          tableLabel,
          businessName: options.businessName,
          businessLocation: options.businessLocation,
          businessPhone: options.businessPhone,
          businessPhoneSecondary: options.businessPhoneSecondary,
          businessLogoUrl: options.businessLogoUrl,
          copyType: 'customer',
          currency: options.currency,
          receiptTemplate,
        });
        toast.success(`Printing bill for ${formatOrderLabel(order)}`);
      } catch (err) {
        toast.error(formatApiError(err));
      } finally {
        isPrintingRef.current = false;
      }
    },
    [options, receiptTemplate, toast],
  );

  const queuePrintBillPrompt = useCallback(
    (
      order: Order,
      context: PrintBillPromptContext,
      onDone?: () => void,
      onAddMore?: () => void,
    ) => {
      if (context === 'order-placed') {
        printCustomerBill(order);
        if (onAddMore) {
          setPrompt({ order, context: 'order-placed-followup', onDone, onAddMore });
        } else {
          onDone?.();
        }
        return;
      }
      setPrompt({ order, context, onDone, onAddMore });
    },
    [printCustomerBill],
  );

  const handlePrint = useCallback(() => {
    if (!prompt) return;
    const current = prompt;
    setPrompt(null);
    printCustomerBill(current.order);
    current.onDone?.();
  }, [printCustomerBill, prompt]);

  const handleAddMore = useCallback(() => {
    if (!prompt) return;
    const onAddMore = prompt.onAddMore;
    setPrompt(null);
    onAddMore?.();
  }, [prompt]);

  const PrintBillPrompt = (
    <PrintBillPromptDialog
      open={!!prompt}
      context={prompt?.context ?? 'order-placed'}
      onPrint={handlePrint}
      onSkip={closePrompt}
      onAddMore={prompt?.onAddMore ? handleAddMore : undefined}
    />
  );

  return { queuePrintBillPrompt, printCustomerBill, PrintBillPrompt };
}
