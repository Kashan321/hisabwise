export interface CartLine {
  key: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  variantId?: string;
  variantName?: string;
}

export function cartLineKey(menuItemId: string, variantId?: string): string {
  return variantId ? `${menuItemId}:${variantId}` : menuItemId;
}

export function cartSubtotal(lines: CartLine[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0) * 100) / 100;
}