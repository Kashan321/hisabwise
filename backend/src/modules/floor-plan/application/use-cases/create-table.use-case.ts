import { FloorTableRepository } from '../../domain/repositories/floor-table.repository';
import { FloorPlanRepository } from '../../domain/repositories/floor-plan.repository';
import { DuplicateTableIdentifierError } from '../../domain/errors/floor-plan.errors';
import { CreateTableInput } from '../../domain/entities/floor-table.entity';

export class CreateTableUseCase {
  constructor(
    private readonly tableRepository: FloorTableRepository,
    private readonly planRepository: FloorPlanRepository,
  ) {}

  async execute(businessId: string, input: CreateTableInput) {
    const floorPlanId =
      input.floorPlanId ?? (await this.planRepository.ensureDefaultPlan(businessId)).id;
    try {
      return await this.tableRepository.create(businessId, input, floorPlanId);
    } catch (error) {
      if (this.isUniqueError(error)) throw new DuplicateTableIdentifierError();
      throw error;
    }
  }

  private isUniqueError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }
}
