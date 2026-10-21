import { FloorTableRepository } from '../../domain/repositories/floor-table.repository';
import { TableNotFoundError } from '../../domain/errors/floor-plan.errors';

export class DeleteTableUseCase {
  constructor(private readonly tableRepository: FloorTableRepository) {}

  async execute(businessId: string, tableId: string) {
    const existing = await this.tableRepository.findById(businessId, tableId);
    if (!existing) throw new TableNotFoundError();
    await this.tableRepository.delete(businessId, tableId);
  }
}
