import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { MenuItem, MenuItemVariant } from '@/lib/api/types';
import { cartLineKey, cartSubtotal, type CartLine } from '@/lib/cart/types';

type CartState = {
  lines: CartLine[];
  subtotal: number;
  itemCount: number;
  addItem: (item: MenuItem, variant?: MenuItemVariant) => void;
  removeLine: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);

function unitPriceFor(item: MenuItem, variant?: MenuItemVariant): number {
  const raw = variant ? variant.price : item.price;
  return Number(raw);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addItem = useCallback((item: MenuItem, variant?: MenuItemVariant) => {
    const key = cartLineKey(item.id, variant?.id);
    const price = unitPriceFor(item, variant);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key,
          menuItemId: item.id,
          name: variant ? `${item.name} (${variant.name})` : item.name,
          unitPrice: price,
          quantity: 1,
          variantId: variant?.id,
          variantName: variant?.name,
        },
      ];
    });
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) {
      setLines((prev) => prev.filter((l) => l.key !== key));
      return;
    }
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity } : l)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartState>(
    () => ({
      lines,
      subtotal: cartSubtotal(lines),
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      addItem,
      removeLine,
      setQuantity,
      clear,
    }),
    [lines, addItem, removeLine, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}