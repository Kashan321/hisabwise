import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { FloorTableRepository } from '../../domain/repositories/floor-table.repository';
import { TableNotFoundError } from '../../domain/errors/floor-plan.errors';
import { TableStatus } from '../../domain/entities/floor-table.entity';

export class UpdateTableStatusUseCase {
  constructor(private readonly tableRepository: FloorTableRepository) {}

  async execute(businessId: string, tableId: string, status: TableStatus) {
    const existing = await this.tableRepository.findById(businessId, tableId);
    if (!existing) throw new TableNotFoundError();
    const table = await this.tableRepository.updateStatus(businessId, tableId, status);
    emitDomainEvent('table.status_changed', { tableId, businessId, status });
    return table;
  }
}
