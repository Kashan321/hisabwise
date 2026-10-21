import { prisma } from '../../../shared/database/prisma-client';
import { BusinessNotFoundError } from '../../tenants/domain/errors/tenant.errors';
import { TableNotFoundError } from '../../floor-plan/domain/errors/floor-plan.errors';
import { buildCounterOrderUrl, buildTableOrderUrl, QrPayload } from '../domain/qr-url.builder';

export class QrCodeService {
  async getCounterQr(businessId: string): Promise<QrPayload> {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new BusinessNotFoundError();

    return {
      type: 'counter',
      url: buildCounterOrderUrl(business.slug),
      businessSlug: business.slug,
    };
  }

  async getTableQr(businessId: string, tableId: string): Promise<QrPayload> {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new BusinessNotFoundError();

    const table = await prisma.floorTable.findFirst({ where: { id: tableId, businessId } });
    if (!table) throw new TableNotFoundError();

    return {
      type: 'table',
      url: buildTableOrderUrl(business.slug, table.tableIdentifier),
      businessSlug: business.slug,
      tableIdentifier: table.tableIdentifier,
    };
  }
}

export const qrCodeService = new QrCodeService();
