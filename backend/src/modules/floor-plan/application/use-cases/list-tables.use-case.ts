import { FloorTableRepository } from '../../domain/repositories/floor-table.repository';

export class ListTablesUseCase {
  constructor(private readonly tableRepository: FloorTableRepository) {}

  execute(businessId: string, floorPlanId?: string) {
    return this.tableRepository.findAll(businessId, floorPlanId);
  }
}
