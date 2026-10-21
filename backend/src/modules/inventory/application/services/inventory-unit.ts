import type { InventoryUnit } from '@prisma/client';

/** Convert any unit to the inventory item's storage base unit. */
export function convertToBaseUnit(quantity: number, fromUnit: InventoryUnit, storageUnit: InventoryUnit): number {
  const fromBase = toBaseQuantity(quantity, fromUnit);
  return fromStorageBase(fromBase, storageUnit);
}

/** Normalize to internal base: g for weight, ml for volume, piece for count. */
export function toBaseQuantity(quantity: number, unit: InventoryUnit): number {
  switch (unit) {
    case 'KG':
      return quantity * 1000;
    case 'G':
      return quantity;
    case 'LITER':
      return quantity * 1000;
    case 'ML':
      return quantity;
    case 'PIECE':
    case 'PACK':
    case 'BOTTLE':
      return quantity;
    default:
      return quantity;
  }
}

export function fromStorageBase(baseQuantity: number, storageUnit: InventoryUnit): number {
  switch (storageUnit) {
    case 'KG':
      return baseQuantity / 1000;
    case 'G':
      return baseQuantity;
    case 'LITER':
      return baseQuantity / 1000;
    case 'ML':
      return baseQuantity;
    case 'PIECE':
    case 'PACK':
    case 'BOTTLE':
      return baseQuantity;
    default:
      return baseQuantity;
  }
}

export function unitsCompatible(a: InventoryUnit, b: InventoryUnit): boolean {
  const weight = new Set<InventoryUnit>(['KG', 'G']);
  const volume = new Set<InventoryUnit>(['LITER', 'ML']);
  const count = new Set<InventoryUnit>(['PIECE', 'PACK', 'BOTTLE']);
  if (weight.has(a) && weight.has(b)) return true;
  if (volume.has(a) && volume.has(b)) return true;
  if (count.has(a) && count.has(b)) return true;
  return a === b;
}

export function isCountUnit(unit: InventoryUnit): boolean {
  return unit === 'PIECE' || unit === 'PACK' || unit === 'BOTTLE';
}
