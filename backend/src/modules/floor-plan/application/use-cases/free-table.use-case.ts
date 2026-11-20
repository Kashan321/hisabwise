import { prisma } from '../../../../shared/database/prisma-client';
import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { tenantAuditService } from '../../../../shared/audit/tenant-audit.service';
import { TableHasOpenBillError, TableNotFoundError } from '../../domain/errors/floor-plan.errors';
import { FloorTableRepository } from '../../domain/repositories/floor-table.repository';

export class FreeTableUseCase {
  constructor(private readonly tableRepository: FloorTableRepository) {}

  async execute(
    businessId: string,
    tableId: string,
    actor: { userId: string; userName?: string },
  ) {
    const table = await this.tableRepository.findById(businessId, tableId);
    if (!table) throw new TableNotFoundError();

    const openOrder = await prisma.order.findFirst({
      where: {
        businessId,
        tableId,
        isDraft: false,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      select: { id: true, totalAmount: true, ticketNumber: true },
    });

    if (openOrder) {
      throw new TableHasOpenBillError();
    }

    await prisma.floorTable.update({
      where: { id: tableId },
      data: { status: 'AVAILABLE', assignedWaiterId: null },
    });
    const updated = await this.tableRepository.findById(businessId, tableId);
    if (!updated) throw new TableNotFoundError();
    emitDomainEvent('table.status_changed', { tableId, businessId, status: 'AVAILABLE' });

    await tenantAuditService.log({
      businessId,
      userId: actor.userId,
      action: 'table.freed',
      targetType: 'table',
      targetId: tableId,
      metadata: { userName: actor.userName, tableIdentifier: table.tableIdentifier },
    });

    return updated;
  }
}
