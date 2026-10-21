'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { Icon, Spinner } from '@/components/ui';
import { ItemCustomizationModal } from '@/components/orders/item-customization-modal';
import type { CartLine, CartLineSelection } from '@/lib/cart-line';
import {
  cartLineKey,
  formatCartLineSummary,
  itemNeedsCustomization,
  isCartLineValid,
  lineUnitPrice,
} from '@/lib/cart-line';
import {
  clearCart,
  loadCart,
  loadTableContext,
  replaceCartLine,
  updateCartLineQuantity,
} from '@/lib/cart-storage';
import { formatApiError } from '@/lib/api/errors';
import { useCreatePublicOrder } from '@/lib/hooks/mutations';
import { usePublicMenu } from '@/lib/hooks/queries';
import { formatCurrency } from '@/lib/format-currency';
import { businessTaxRatePercent } from '@/lib/order-pricing';
import { themeToStyle } from '@/lib/theme/theme-css';
import { useToast } from '@/lib/toast';
import type { MenuItem } from '@/lib/api/types';

export default function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const toast = useToast();
  const { data } = usePublicMenu(slug);
  const themeStyle = themeToStyle(data?.business);
  const createOrder = useCreatePublicOrder(slug);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tableCtx, setTableCtx] = useState(loadTableContext(slug));
  const [customizationItem, setCustomizationItem] = useState<MenuItem | null>(null);
  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);
  const [initialSelection, setInitialSelection] = useState<CartLineSelection | undefined>();

  useEffect(() => {
    setCart(loadCart(slug));
    setTableCtx(loadTableContext(slug));
  }, [slug]);

  const itemById = useMemo(
    () =>
      Object.fromEntries(
        (data?.menu ?? []).flatMap((c) => c.items ?? []).map((item) => [item.id, item]),
      ),
    [data],
  );

  const lines = useMemo(
    () =>
      cart
        .map((line) => {
          const item = itemById[line.menuItemId];
          if (!item) return null;
          const lineKey = cartLineKey(line.menuItemId, line.modifierOptionIds, line.variantId);
          const unitPrice = lineUnitPrice(item, line.modifierOptionIds, line.variantId);
          return {
            lineKey,
            line,
            item,
            unitPrice,
            summaryLines: formatCartLineSummary(item, line),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [cart, itemById],
  );

  const subtotal = lines.reduce((sum, entry) => sum + entry.unitPrice * entry.line.quantity, 0);
  const taxPercent = businessTaxRatePercent(data?.business);
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;
  const currency = data?.business?.currency ?? undefined;
  const formatMoney = (amount: number) => formatCurrency(amount, currency);

  function updateQty(lineKey: string, delta: number) {
    setCart(updateCartLineQuantity(slug, lineKey, delta, cart));
  }

  function handleEdit(lineKey: string, line: CartLine, item: MenuItem) {
    setEditingLineKey(lineKey);
    setInitialSelection({
      variantId: line.variantId,
      modifierOptionIds: line.modifierOptionIds,
    });
    setCustomizationItem(item);
  }

  function handleCustomizationConfirm(selection: CartLineSelection) {
    if (!customizationItem || !editingLineKey) return;
    const line = cart.find(
      (entry) =>
        cartLineKey(entry.menuItemId, entry.modifierOptionIds, entry.variantId) === editingLineKey,
    );
    if (!line) return;
    setCart(
      replaceCartLine(
        slug,
        editingLineKey,
        {
          menuItemId: customizationItem.id,
          variantId: selection.variantId,
          modifierOptionIds: selection.modifierOptionIds,
          quantity: line.quantity,
        },
        cart,
      ),
    );
    setEditingLineKey(null);
    setInitialSelection(undefined);
    setCustomizationItem(null);
  }

  async function placeOrder() {
    const inventoryAvailability = data?.inventoryAvailability;
    const validLines = cart.filter((line) =>
      isCartLineValid(itemById[line.menuItemId], line, inventoryAvailability),
    );
    if (!validLines.length) {
      toast.error('Some items are no longer available. Please update your cart.');
      return;
    }

    const items = validLines.map((line) => ({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      ...(line.variantId ? { variantId: line.variantId } : {}),
      ...(line.modifierOptionIds.length ? { modifierOptionIds: line.modifierOptionIds } : {}),
    }));

    try {
      const result = await createOrder.mutateAsync({
        tableId: tableCtx?.tableId,
        items,
      });
      clearCart(slug);
      toast.success('Order sent to kitchen!');
      window.location.href = `/${slug}/order/confirm?orderId=${result.order.id}`;
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  if (!lines.length) {
    return (
      <div
        className="min-h-screen bg-surface flex flex-col items-center justify-center px-margin-mobile text-center"
        style={themeStyle}
      >
        <Icon name="shopping_bag" className="text-5xl text-outline mb-4" />
        <h1 className="font-display-md text-primary mb-2">Your cart is empty</h1>
        <Link
          href={`/${slug}/order`}
          className="font-body-emphasis text-secondary hover:underline cursor-pointer"
        >
          Browse menu
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-surface font-body-base text-on-surface pb-32"
      style={themeStyle}
    >
      {customizationItem && (
        <ItemCustomizationModal
          item={customizationItem}
          open={!!customizationItem}
          onClose={() => {
            setCustomizationItem(null);
            setEditingLineKey(null);
            setInitialSelection(undefined);
          }}
          initialSelection={initialSelection}
          confirmLabel="Update item"
          onConfirm={handleCustomizationConfirm}
          inventoryAvailability={data?.inventoryAvailability}
        />
      )}

      <header className="bg-primary-container text-on-primary sticky top-0 z-40 px-margin-mobile py-4 flex items-center gap-3">
        <Link href={`/${slug}/order`} className="tap-target p-2 -ml-2 cursor-pointer">
          <Icon name="arrow_back" />
        </Link>
        <div>
          <h1 className="font-title-lg">Your Order</h1>
          {tableCtx && (
            <p className="font-caption text-on-primary-container">Table {tableCtx.tableIdentifier}</p>
          )}
        </div>
      </header>

      <main className="px-margin-mobile pt-6 max-w-md mx-auto space-y-4">
        {lines.map(({ lineKey, line, item, unitPrice, summaryLines }) => (
          <div
            key={lineKey}
            className="flex gap-4 p-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl"
          >
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-fixed to-surface-container flex items-center justify-center shrink-0 overflow-hidden relative">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <Icon name="local_cafe" className="text-primary/30" />
              )}
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-body-emphasis block">{item.name}</span>
                  {summaryLines.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {summaryLines.map((summaryLine) => (
                        <p key={summaryLine} className="font-caption text-on-surface-variant">
                          {summaryLine}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <span className="font-mono shrink-0">
                  {formatMoney(unitPrice * line.quantity)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => updateQty(lineKey, -1)}
                  className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center cursor-pointer"
                >
                  −
                </button>
                <span className="font-mono w-4 text-center">{line.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQty(lineKey, 1)}
                  className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
                {itemNeedsCustomization(item) && (
                  <button
                    type="button"
                    onClick={() => handleEdit(lineKey, line, item)}
                    className="ml-auto font-caption text-secondary hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-dashed border-outline-variant/40 space-y-2">
          <div className="flex justify-between font-body-base text-on-surface-variant">
            <span>Subtotal</span>
            <span className="font-mono">{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between font-body-base text-on-surface-variant">
            <span>Tax ({taxPercent}%)</span>
            <span className="font-mono">{formatMoney(tax)}</span>
          </div>
          <div className="flex justify-between font-title-lg text-primary pt-2">
            <span>Total</span>
            <span className="font-mono">{formatMoney(total)}</span>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-surface/90 backdrop-blur-md border-t border-outline-variant/10">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={placeOrder}
            disabled={createOrder.isPending}
            className="w-full tap-target bg-primary text-on-primary font-body-emphasis py-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {createOrder.isPending ? (
              <>
                <Spinner className="h-5 w-5" /> Placing order…
              </>
            ) : (
              <>
                Place Order
                <Icon name="arrow_forward" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
