import { Request, Response } from 'express';
import { prisma } from '../../../../shared/database/prisma-client';
import { runWithTenantContext } from '../../../../shared/tenant-context/tenant-context';
import { menuModule } from '../../../menu/infrastructure/menu.module';
import { inventoryModule } from '../../../inventory/infrastructure/inventory.module';
import { ordersModule } from '../../../orders/infrastructure/orders.module';
import { platformSettingsRepository } from '../../../platform-admin/infrastructure/platform-settings.repository';
import { filesModule } from '../../../files/infrastructure/files.module';
import { success, fail } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { CreateOrderInput } from '../../../orders/domain/entities/order.entity';
import { resolveReceiptTemplateForBusiness } from '../../../receipt/receipt-template.service';
import { resolveBusinessThemeWithPlatform } from '../../../../shared/branding/default-theme';

export class PublicController {
  getBranding = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await platformSettingsRepository.getOrCreate();
    return success(res, {
      branding: {
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        backgroundColor: settings.backgroundColor,
        textColor: settings.textColor,
      },
    });
  });

  getBusiness = asyncHandler(async (req: Request, res: Response) => {
    const business = await prisma.business.findUnique({
      where: { slug: String(req.params.businessSlug) },
    });

    if (!business) {
      return fail(res, ErrorCodes.BUSINESS_NOT_FOUND, 'Business not found', 404);
    }

    const menu = await runWithTenantContext(
      { businessId: business.id, userId: 'public', roles: [], permissions: ['*'] },
      () => menuModule.getFullMenu.execute(business.id),
    ).then((categories) =>
      categories.map((category) => ({
        ...category,
        items: category.items.map(({ basePrice: _basePrice, variants, ...item }) => ({
          ...item,
          variants: variants.map(({ basePrice: _variantBasePrice, ...variant }) => variant),
        })),
      })),
    );

    const inventoryAvailability = await runWithTenantContext(
      { businessId: business.id, userId: 'public', roles: [], permissions: ['*'] },
      () => inventoryModule.getAvailability.execute(business.id),
    );

    const receiptTemplate = await resolveReceiptTemplateForBusiness(business.id);
    const platform = await platformSettingsRepository.getOrCreate();
    const theme = resolveBusinessThemeWithPlatform(business, platform);

    return success(res, {
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        location: business.location,
        phone: business.phone,
        phoneSecondary: business.phoneSecondary,
        logoUrl: await filesModule.storageUrlResolver.resolveReadUrl(business.logoUrl),
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        currency: business.currency,
        defaultTaxRate: Number(business.defaultTaxRate),
      },
      menu,
      inventoryAvailability,
      receiptTemplate,
    });
  });

  getTable = asyncHandler(async (req: Request, res: Response) => {
    const business = await prisma.business.findUnique({
      where: { slug: String(req.params.businessSlug) },
    });

    if (!business) {
      return fail(res, ErrorCodes.BUSINESS_NOT_FOUND, 'Business not found', 404);
    }

    const table = await prisma.floorTable.findFirst({
      where: {
        businessId: business.id,
        tableIdentifier: String(req.params.tableIdentifier),
      },
    });

    if (!table) {
      return fail(res, ErrorCodes.TABLE_NOT_FOUND, 'Table not found', 404);
    }

    return success(res, {
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
      },
      table: {
        id: table.id,
        tableIdentifier: table.tableIdentifier,
        capacity: table.capacity,
        status: table.status,
      },
    });
  });

  createOrder = asyncHandler(async (req: Request, res: Response) => {
    const businessSlug = String(req.params.businessSlug);
    const business = await prisma.business.findUnique({ where: { slug: businessSlug } });

    if (!business) {
      return fail(res, ErrorCodes.BUSINESS_NOT_FOUND, 'Business not found', 404);
    }

    const body = req.body as {
      tableId?: string;
      items: CreateOrderInput['items'];
      notes?: string;
    };

    if (body.tableId) {
      const table = await prisma.floorTable.findFirst({
        where: { id: body.tableId, businessId: business.id },
      });
      if (!table) {
        return fail(res, ErrorCodes.TABLE_NOT_FOUND, 'Table not found', 404);
      }
    }

    const input: CreateOrderInput = {
      source: 'QR_CUSTOMER',
      orderType: 'QR',
      tableId: body.tableId,
      items: body.items,
      notes: body.notes,
    };

    const order = await runWithTenantContext(
      { businessId: business.id, userId: 'public', roles: [], permissions: ['*'] },
      () => ordersModule.createOrder.execute(business.id, input),
    );

    return success(res, { order }, 201);
  });

  getOrder = asyncHandler(async (req: Request, res: Response) => {
    const businessSlug = String(req.params.businessSlug);
    const orderId = String(req.params.orderId);

    const business = await prisma.business.findUnique({ where: { slug: businessSlug } });
    if (!business) {
      return fail(res, ErrorCodes.BUSINESS_NOT_FOUND, 'Business not found', 404);
    }

    const order = await runWithTenantContext(
      { businessId: business.id, userId: 'public', roles: [], permissions: ['*'] },
      () => ordersModule.getOrder.execute(business.id, orderId),
    );

    if (order.source !== 'QR_CUSTOMER') {
      return fail(res, ErrorCodes.FORBIDDEN, 'Order not available', 403);
    }

    const receiptTemplate = await resolveReceiptTemplateForBusiness(business.id);

    return success(res, {
      order,
      business: {
        name: business.name,
        location: business.location,
        phone: business.phone,
        phoneSecondary: business.phoneSecondary,
        logoUrl: await filesModule.storageUrlResolver.resolveReadUrl(business.logoUrl),
        currency: business.currency,
        defaultTaxRate: Number(business.defaultTaxRate),
      },
      receiptTemplate,
    });
  });
}

export const publicController = new PublicController();
