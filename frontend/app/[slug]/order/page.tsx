'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui';
import { ItemCustomizationModal } from '@/components/orders/item-customization-modal';
import type { CartLine, CartLineSelection } from '@/lib/cart-line';
import {
  getItemDisplayPrice,
  itemNeedsCustomization,
  isCartLineValid,
  isSellableInventoryOk,
  lineUnitPrice,
} from '@/lib/cart-line';
import { loadCart, loadTableContext, saveCart, upsertCartLine } from '@/lib/cart-storage';
import { APP_NAME } from '@/lib/config';
import { usePublicMenu } from '@/lib/hooks/queries';
import { formatCurrency } from '@/lib/format-currency';
import { themeToStyle } from '@/lib/theme/theme-css';
import type { MenuItem } from '@/lib/api/types';

function isFeaturedItem(item: MenuItem) {
  return (item.description?.length ?? 0) > 60;
}

function itemPriceLabel(item: MenuItem, formatMoney: (amount: number | string) => string) {
  if ((item.variants?.length ?? 0) > 0) {
    return `From ${formatMoney(getItemDisplayPrice(item))}`;
  }
  return formatMoney(item.price);
}

export default function CustomerMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data, isLoading } = usePublicMenu(slug);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customizationItem, setCustomizationItem] = useState<MenuItem | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [cartBarVisible, setCartBarVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [tableCtx, setTableCtx] = useState<{ tableId: string; tableIdentifier: string } | null>(
    null,
  );

  const categories = data?.menu ?? [];
  const inventoryAvailability = data?.inventoryAvailability;
  const business = data?.business;
  const branchName = business?.name ?? APP_NAME;
  const branchLocation = business?.location ?? slug.replace(/-/g, ' ');
  const formatMoney = (amount: number | string) =>
    formatCurrency(amount, business?.currency ?? undefined);

  const itemById = useMemo(
    () =>
      Object.fromEntries(
        categories.flatMap((c) => c.items ?? []).map((item) => [item.id, item]),
      ),
    [categories],
  );

  useEffect(() => {
    setCart(loadCart(slug));
    setTableCtx(loadTableContext(slug));
    setHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (categories.length && !activeCategoryId) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => {
    const item = itemById[line.menuItemId];
    if (!item) return sum;
    return sum + lineUnitPrice(item, line.modifierOptionIds, line.variantId) * line.quantity;
  }, 0);

  useEffect(() => {
    if (!hydrated) return;
    saveCart(slug, cart);
  }, [cart, slug, hydrated]);

  useEffect(() => {
    function onScroll() {
      const st = window.scrollY;
      if (st > lastScroll && st > 100) setCartBarVisible(false);
      else setCartBarVisible(true);
      setLastScroll(st);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastScroll]);

  function showAddedToast() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function handleAddItem(item: MenuItem) {
    if (itemNeedsCustomization(item)) {
      setCustomizationItem(item);
      return;
    }
    setCart(upsertCartLine(slug, { menuItemId: item.id, modifierOptionIds: [], quantity: 1 }));
    showAddedToast();
  }

  function handleCustomizationConfirm(selection: CartLineSelection) {
    if (!customizationItem) return;
    setCart(
      upsertCartLine(slug, {
        menuItemId: customizationItem.id,
        variantId: selection.variantId,
        modifierOptionIds: selection.modifierOptionIds,
        quantity: 1,
      }),
    );
    showAddedToast();
  }

  return (
    <div
      className="bg-surface font-body-base text-on-surface antialiased min-h-screen pb-28 selection:bg-secondary-container"
      style={themeToStyle(business)}
    >
      {customizationItem && (
        <ItemCustomizationModal
          item={customizationItem}
          open={!!customizationItem}
          onClose={() => setCustomizationItem(null)}
          onConfirm={handleCustomizationConfirm}
          confirmLabel="Add to order"
          inventoryAvailability={inventoryAvailability}
        />
      )}

      <header className="bg-primary-container text-on-primary sticky top-0 z-40 transition-all duration-300">
        <div className="px-margin-mobile py-6 flex flex-col items-center">
          {business?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt=""
              className="w-16 h-16 rounded-xl object-cover mb-3 border border-white/10"
            />
          ) : null}
          <h1 className="font-display-lg-mobile text-white mb-1">{branchName}</h1>
          <p className="font-caption text-on-primary-container uppercase tracking-widest">
            {tableCtx ? `Table ${tableCtx.tableIdentifier}` : branchLocation}
          </p>
        </div>
        <nav className="bg-primary-container/95 backdrop-blur-md border-t border-outline-variant/10 overflow-x-auto hide-scrollbar flex whitespace-nowrap px-margin-mobile">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategoryId(cat.id);
                document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`py-4 px-4 font-body-emphasis border-b-2 transition-colors shrink-0 ${
                activeCategoryId === cat.id
                  ? 'border-secondary text-white'
                  : 'border-transparent text-on-primary-container/60'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      </header>

      <main className="px-margin-mobile pt-6 space-y-8 max-w-md mx-auto">
        {isLoading && (
          <p className="font-caption text-center py-12 text-on-surface-variant">Loading menu…</p>
        )}

        {categories.map((cat) => {
          const items =
            cat.items?.filter(
              (i) =>
                i.isAvailable &&
                isSellableInventoryOk(inventoryAvailability, i.id, null, []),
            ) ?? [];
          if (!items.length) return null;
          return (
            <section key={cat.id} id={`cat-${cat.id}`}>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-title-lg text-primary">{cat.name}</h2>
                <span className="font-caption text-on-surface-variant">{items.length} Items</span>
              </div>
              <div className="grid gap-4">
                {items.map((item) => {
                  const featured = isFeaturedItem(item);
                  return (
                    <div
                      key={item.id}
                      className={`bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform ${
                        featured ? 'flex flex-col' : 'flex'
                      }`}
                    >
                      <div
                        className={`relative shrink-0 bg-gradient-to-br from-primary-fixed via-surface-container to-secondary-fixed/30 flex items-center justify-center overflow-hidden ${
                          featured ? 'w-full h-48' : 'w-32 h-32'
                        }`}
                      >
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <Icon name="local_cafe" className="text-4xl text-primary/25" filled />
                        )}
                      </div>
                      <div
                        className={`p-4 flex flex-col justify-between flex-grow ${featured ? '' : 'min-w-0'}`}
                      >
                        {featured ? (
                          <>
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-body-emphasis text-on-surface">{item.name}</h3>
                                {item.description && (
                                  <p className="font-caption text-on-surface-variant mt-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <span className="font-body-emphasis text-secondary ml-4 shrink-0">
                                {itemPriceLabel(item, formatMoney)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddItem(item)}
                              className="mt-4 w-full tap-target bg-primary text-on-primary rounded-lg font-body-emphasis hover:bg-secondary-container hover:text-on-secondary-container transition-all flex items-center justify-center gap-2 py-3"
                            >
                              <Icon name="add" className="text-sm" />
                              {itemNeedsCustomization(item) ? 'Customize' : 'Add to Order'}
                            </button>
                          </>
                        ) : (
                          <>
                            <div>
                              <h3 className="font-body-emphasis text-on-surface">{item.name}</h3>
                              {item.description && (
                                <p className="font-caption text-on-surface-variant mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-body-emphasis text-secondary">
                                {itemPriceLabel(item, formatMoney)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddItem(item)}
                                className="tap-target flex items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1.5 text-sm font-medium hover:bg-primary hover:text-on-primary transition-colors"
                              >
                                {itemNeedsCustomization(item) ? 'Customize' : 'Add'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {!isLoading && categories.length === 0 && (
          <p className="text-center py-16 font-caption text-on-surface-variant">
            Menu coming soon.
          </p>
        )}
      </main>

      {cartCount > 0 && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 transition-transform duration-500 ${
            cartBarVisible ? 'translate-y-0' : 'translate-y-[120%]'
          }`}
        >
          <div className="max-w-md mx-auto bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-between p-2 pl-6 animate-slide-up ring-1 ring-white/10">
            <div className="flex flex-col">
              <span className="font-body-emphasis leading-tight">
                {cartCount} item{cartCount !== 1 ? 's' : ''} · {formatMoney(cartTotal)}
              </span>
              <span className="font-caption text-on-primary-container leading-tight">
                View details
              </span>
            </div>
            <Link
              href={`/${slug}/order/cart`}
              className="bg-secondary-container text-on-secondary-container px-6 py-3 rounded-full font-body-emphasis flex items-center gap-2 tap-target hover:scale-[1.02] active:scale-95 transition-all"
            >
              View Cart
              <Icon name="arrow_forward" className="text-lg" />
            </Link>
          </div>
        </div>
      )}

      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-on-surface text-surface px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-xl transition-opacity duration-300 pointer-events-none ${
          toastVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Icon name="check_circle" filled className="text-sm text-secondary-container" />
        Added to your order
      </div>
    </div>
  );
}
