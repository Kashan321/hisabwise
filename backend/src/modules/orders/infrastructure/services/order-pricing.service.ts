import { prisma } from '../../../../shared/database/prisma-client';
import { ORDER } from '../../../../config/constants';
import {
  AddOrderItemsInput,
  CreateOrderInput,
  CreateOrderItemInput,
  OrderPricingResult,
  PricedOrderItem,
  UpdateOrderPricingInput,
} from '../../domain/entities/order.entity';
import {
  InvalidOrderItemError,
  MenuItemUnavailableError,
  OrderNotFoundError,
  OrderNotModifiableError,
  PromotionNotApplicableError,
} from '../../domain/errors/order.errors';
import { OrderPricingPort } from '../../domain/repositories/order.repository';
import { inventoryStockService } from '../../../inventory/application/services/inventory-stock.service';
import { normalizePriceRounding } from '../../../menu/application/menu-weight-config';
import {
  computeWeightLineBase,
  computeWeightLineTotal,
  validateWeightInput,
} from '../../../../shared/pricing/weight-line-pricing';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertCanUpdateOrderPricing(order: {
  status: string;
  paymentStatus: string | null;
}) {
  if (order.paymentStatus === 'PAID') {
    throw new OrderNotModifiableError('Cannot change pricing on a paid order');
  }
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
    throw new OrderNotModifiableError('Cannot change pricing on a completed or cancelled order');
  }
}

function calculatePromotionDiscount(
  subtotal: number,
  discountType: 'PERCENTAGE' | 'FIXED',
  discountValue: number,
): number {
  if (discountType === 'PERCENTAGE') {
    return roundMoney(Math.min(subtotal, subtotal * (discountValue / 100)));
  }

  return roundMoney(Math.min(subtotal, discountValue));
}

type ModifierGroupWithOptions = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: Array<{
    id: string;
    name: string;
    priceAdjustment: { toString(): string };
    isAvailable: boolean;
  }>;
};

function validateModifierSelections(
  groups: ModifierGroupWithOptions[],
  selectedOptionIds: string[],
  itemName: string,
): PricedOrderItem['modifiers'] {
  const uniqueIds = new Set(selectedOptionIds);
  if (uniqueIds.size !== selectedOptionIds.length) {
    throw new InvalidOrderItemError(`Duplicate modifier selections for "${itemName}"`);
  }

  const selectedByGroup = new Map<string, string[]>();

  for (const optionId of selectedOptionIds) {
    const group = groups.find((entry) => entry.options.some((option) => option.id === optionId));
    if (!group) {
      throw new InvalidOrderItemError(
        `Modifier option ${optionId} is not valid for item "${itemName}"`,
      );
    }

    const picks = selectedByGroup.get(group.id) ?? [];
    picks.push(optionId);
    selectedByGroup.set(group.id, picks);
  }

  for (const group of groups) {
    const picks = selectedByGroup.get(group.id) ?? [];
    const minRequired = group.isRequired ? Math.max(1, group.minSelect) : group.minSelect;

    if (picks.length < minRequired) {
      throw new InvalidOrderItemError(
        `Please select at least ${minRequired} option(s) for "${group.name}" on "${itemName}"`,
      );
    }

    if (picks.length > group.maxSelect) {
      throw new InvalidOrderItemError(
        `You can select at most ${group.maxSelect} option(s) for "${group.name}" on "${itemName}"`,
      );
    }
  }

  const selectedModifiers: PricedOrderItem['modifiers'] = [];

  for (const optionId of selectedOptionIds) {
    const option = groups.flatMap((group) => group.options).find((entry) => entry.id === optionId);

    if (!option || !option.isAvailable) {
      throw new InvalidOrderItemError(`Selected modifier is unavailable for "${itemName}"`);
    }

    selectedModifiers.push({
      modifierOptionId: option.id,
      modifierName: option.name,
      priceAdjustment: Number(option.priceAdjustment),
    });
  }

  return selectedModifiers;
}

async function priceItems(
  businessId: string,
  items: CreateOrderItemInput[],
): Promise<PricedOrderItem[]> {
  const pricedItems: PricedOrderItem[] = [];

  for (const line of items) {
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: line.menuItemId, businessId },
      include: {
        variants: { orderBy: { displayOrder: 'asc' } },
        modifierGroups: {
          include: {
            modifierGroup: {
              include: { options: true },
            },
          },
        },
      },
    });

    if (!menuItem) {
      throw new InvalidOrderItemError(
        `Menu item not found. It may have been removed — refresh and add it again.`,
      );
    }

    if (!menuItem.isAvailable) {
      throw new MenuItemUnavailableError(menuItem.name);
    }

    const modifierGroups = menuItem.modifierGroups
      .filter((link) => link.modifierGroup)
      .map((link) => link.modifierGroup);

    const isByWeight = menuItem.pricingType === 'BY_WEIGHT';
    const hasVariants = menuItem.variants.length > 0;

    let variantId: string | null = null;
    let variantName: string | null = null;
    let variantPrice: number | null = null;
    let unitPrice = Number(menuItem.price);
    let weightG: number | null = null;
    let unitPricePerKg: number | null = null;

    if (isByWeight) {
      if (line.variantId) {
        throw new InvalidOrderItemError(`"${menuItem.name}" is sold by weight, not by size`);
      }
      if (hasVariants) {
        throw new InvalidOrderItemError(
          `"${menuItem.name}" is misconfigured — remove variants or switch back to fixed pricing`,
        );
      }
      if (menuItem.pricePerKg == null) {
        throw new InvalidOrderItemError(`"${menuItem.name}" is missing a price per kg`);
      }
      const validated = validateWeightInput(line.weightG, { minWeightG: menuItem.minWeightG });
      if (!validated.ok) {
        throw new InvalidOrderItemError(validated.message);
      }
      weightG = validated.weightG;
      unitPricePerKg = Number(menuItem.pricePerKg);
      const rounding = normalizePriceRounding(menuItem.priceRounding);
      unitPrice = computeWeightLineBase(unitPricePerKg, weightG, rounding);
    } else {
      if (line.weightG != null) {
        throw new InvalidOrderItemError(`"${menuItem.name}" is not sold by weight`);
      }

      if (hasVariants && !line.variantId) {
        throw new InvalidOrderItemError(`Please select a size/variant for "${menuItem.name}"`);
      }

      if (!hasVariants && line.variantId) {
        throw new InvalidOrderItemError(`"${menuItem.name}" does not support variants`);
      }

      if (line.variantId) {
        const variant = menuItem.variants.find((entry) => entry.id === line.variantId);
        if (!variant || !variant.isAvailable) {
          throw new InvalidOrderItemError(`Selected variant is unavailable for "${menuItem.name}"`);
        }
        variantId = variant.id;
        variantName = variant.name;
        variantPrice = Number(variant.price);
        unitPrice = variantPrice;
      }
    }

    const selectedModifiers = validateModifierSelections(
      modifierGroups,
      line.modifierOptionIds ?? [],
      menuItem.name,
    );

    await inventoryStockService.validateOrderLinesAvailable(businessId, [
      {
        menuItemId: menuItem.id,
        variantId: variantId,
        quantity: line.quantity,
        weightG,
        modifierOptionIds: line.modifierOptionIds ?? [],
      },
    ]);

    const modifierTotal = selectedModifiers.reduce(
      (sum, modifier) => sum + modifier.priceAdjustment,
      0,
    );
    const lineTotal = isByWeight
      ? computeWeightLineTotal(
          unitPricePerKg!,
          weightG!,
          normalizePriceRounding(menuItem.priceRounding),
          modifierTotal,
          line.quantity,
        )
      : roundMoney((unitPrice + modifierTotal) * line.quantity);

    pricedItems.push({
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      variantId,
      variantName,
      variantPrice,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
      weightG,
      unitPricePerKg,
      customizationNotes: line.customizationNotes ?? null,
      modifiers: selectedModifiers,
    });
  }

  return pricedItems;
}

async function getBusinessPricingDefaults(businessId: string): Promise<{
  defaultTaxRate: number;
  defaultDeliveryCharge: number;
}> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { defaultTaxRate: true, defaultDeliveryCharge: true },
  });
  if (!business) {
    return {
      defaultTaxRate: ORDER.DEFAULT_TAX_RATE,
      defaultDeliveryCharge: ORDER.DEFAULT_DELIVERY_CHARGE,
    };
  }
  return {
    defaultTaxRate: Number(business.defaultTaxRate),
    defaultDeliveryCharge: Number(business.defaultDeliveryCharge),
  };
}

function buildPricingResult(
  pricedItems: PricedOrderItem[],
  options?: {
    subtotalOverride?: number;
    promotionId?: string;
    promotionTitle?: string;
    discountAmount?: number;
    taxRate?: number;
    serviceRate?: number;
    businessDefaultTaxRate?: number;
    deliveryAmount?: number;
  },
): OrderPricingResult {
  const subtotal = roundMoney(
    options?.subtotalOverride ??
      pricedItems.reduce((sum, item) => sum + item.lineTotal, 0),
  );
  const discountAmount = options?.discountAmount ?? 0;
  const discountedSubtotal = roundMoney(subtotal - discountAmount);
  const taxRate = options?.taxRate ?? options?.businessDefaultTaxRate ?? ORDER.DEFAULT_TAX_RATE;
  const serviceRate = options?.serviceRate ?? ORDER.DEFAULT_SERVICE_RATE;
  const taxAmount = roundMoney(discountedSubtotal * taxRate);
  const serviceAmount = roundMoney(discountedSubtotal * serviceRate);
  const deliveryAmount = roundMoney(options?.deliveryAmount ?? 0);
  const totalAmount = roundMoney(
    discountedSubtotal + taxAmount + serviceAmount + deliveryAmount,
  );

  return {
    subtotal,
    discountAmount,
    promotionId: options?.promotionId,
    promotionTitle: options?.promotionTitle,
    taxAmount,
    serviceAmount,
    deliveryAmount,
    totalAmount,
    items: pricedItems,
  };
}

export class OrderPricingService implements OrderPricingPort {
  async calculate(businessId: string, input: CreateOrderInput): Promise<OrderPricingResult> {
    if (!input.items.length) {
      throw new InvalidOrderItemError('Order must contain at least one item');
    }

    const pricedItems = await priceItems(businessId, input.items);
    const subtotal = roundMoney(pricedItems.reduce((sum, item) => sum + item.lineTotal, 0));

    let discountAmount = 0;
    let promotionId: string | undefined;
    let promotionTitle: string | undefined;

    if (input.promotionId) {
      const promotion = await prisma.promotion.findFirst({
        where: { id: input.promotionId, businessId },
      });

      if (!promotion) {
        throw new PromotionNotApplicableError('Promotion not found');
      }

      if (!promotion.isActive) {
        throw new PromotionNotApplicableError('Promotion is not active');
      }

      const now = new Date();
      if (now < promotion.startDate || now > promotion.endDate) {
        throw new PromotionNotApplicableError('Promotion is not valid for the current date');
      }

      discountAmount = calculatePromotionDiscount(
        subtotal,
        promotion.discountType,
        Number(promotion.discountValue),
      );
      promotionId = promotion.id;
      promotionTitle = promotion.title;
    } else if (input.discountType && input.discountValue != null && input.discountValue > 0) {
      discountAmount = calculatePromotionDiscount(subtotal, input.discountType, input.discountValue);
    }

    const businessDefaults = await getBusinessPricingDefaults(businessId);
    const deliveryAmount =
      input.orderType === 'DELIVERY' ? businessDefaults.defaultDeliveryCharge : 0;

    return buildPricingResult(pricedItems, {
      promotionId,
      promotionTitle,
      discountAmount,
      taxRate: input.taxRate,
      serviceRate: input.serviceRate,
      businessDefaultTaxRate: businessDefaults.defaultTaxRate,
      deliveryAmount,
    });
  }

  async calculateAdditionalItems(
    businessId: string,
    input: AddOrderItemsInput,
  ): Promise<OrderPricingResult> {
    if (!input.items.length) {
      throw new InvalidOrderItemError('At least one item is required');
    }

    const pricedItems = await priceItems(businessId, input.items);
    const businessDefaults = await getBusinessPricingDefaults(businessId);

    return buildPricingResult(pricedItems, {
      taxRate: input.taxRate,
      serviceRate: input.serviceRate,
      businessDefaultTaxRate: businessDefaults.defaultTaxRate,
      deliveryAmount: 0,
    });
  }

  async recalculateExistingOrder(
    businessId: string,
    orderId: string,
    input: UpdateOrderPricingInput,
  ): Promise<OrderPricingResult> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, businessId },
      include: { items: true },
    });

    if (!order) {
      throw new OrderNotFoundError();
    }

    assertCanUpdateOrderPricing({
      status: order.status,
      paymentStatus: order.paymentStatus,
    });

    const subtotal = roundMoney(
      order.items.reduce((sum, item) => sum + Number(item.lineTotal), 0),
    );

    let discountAmount = 0;
    let promotionId: string | undefined;
    let promotionTitle: string | undefined;

    const promotionToApply =
      input.promotionId === null
        ? undefined
        : input.promotionId ?? order.promotionId ?? undefined;

    if (promotionToApply) {
      const promotion = await prisma.promotion.findFirst({
        where: { id: promotionToApply, businessId },
      });

      if (!promotion) {
        throw new PromotionNotApplicableError('Promotion not found');
      }

      if (!promotion.isActive) {
        throw new PromotionNotApplicableError('Promotion is not active');
      }

      const now = new Date();
      if (now < promotion.startDate || now > promotion.endDate) {
        throw new PromotionNotApplicableError('Promotion is not valid for the current date');
      }

      discountAmount = calculatePromotionDiscount(
        subtotal,
        promotion.discountType,
        Number(promotion.discountValue),
      );
      promotionId = promotion.id;
      promotionTitle = promotion.title;
    } else if (input.discountType && input.discountValue != null && input.discountValue > 0) {
      discountAmount = calculatePromotionDiscount(subtotal, input.discountType, input.discountValue);
    } else if (input.promotionId === null) {
      discountAmount = 0;
    } else if (!input.discountType && order.promotionId == null && Number(order.discountAmount) > 0) {
      discountAmount = roundMoney(Number(order.discountAmount));
    }

    const businessDefaults = await getBusinessPricingDefaults(businessId);
    const deliveryAmount = Number(order.deliveryAmount);

    const discountedSubtotal = roundMoney(subtotal - discountAmount);
    let taxRate = input.taxRate;
    let serviceRate = input.serviceRate;

    if (taxRate == null && discountedSubtotal > 0) {
      taxRate = Number(order.taxAmount) / discountedSubtotal;
    }
    if (serviceRate == null && discountedSubtotal > 0) {
      serviceRate = Number(order.serviceAmount) / discountedSubtotal;
    }

    return buildPricingResult([], {
      subtotalOverride: subtotal,
      promotionId,
      promotionTitle,
      discountAmount,
      taxRate,
      serviceRate,
      businessDefaultTaxRate: businessDefaults.defaultTaxRate,
      deliveryAmount,
    });
  }
}
