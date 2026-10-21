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

  const queuePrintBillPrompt = useCallback(
    (
      order: Order,
      context: PrintBillPromptContext,
      onDone?: () => void,
      onAddMore?: () => void,
    ) => {
      setPrompt({ order, context, onDone, onAddMore });
    },
    [],
  );

  const handlePrint = useCallback(() => {
    if (!prompt || isPrintingRef.current) return;

    const current = prompt;
    isPrintingRef.current = true;
    setPrompt(null);

    try {
      const tableLabel =
        options.getTableLabel?.(current.order) ??
        current.order.tableIdentifier ??
        (current.order.tableId ? 'Table' : '—');
      printOrderReceipt(current.order, {
        tableLabel,
        businessName: options.businessName,
        businessLocation: options.businessLocation,
        businessPhone: options.businessPhone,
        businessLogoUrl: options.businessLogoUrl,
        copyType: 'customer',
        currency: options.currency,
        receiptTemplate,
      });
      toast.success(`Printing bill for ${formatOrderLabel(current.order)}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      isPrintingRef.current = false;
      current.onDone?.();
    }
  }, [options, prompt, toast]);

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

  return { queuePrintBillPrompt, PrintBillPrompt };
}
