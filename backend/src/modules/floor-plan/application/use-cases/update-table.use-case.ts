import { FloorTableRepository } from '../../domain/repositories/floor-table.repository';
import {
  DuplicateTableIdentifierError,
  TableNotFoundError,
} from '../../domain/errors/floor-plan.errors';
import { UpdateTableInput } from '../../domain/entities/floor-table.entity';

export class UpdateTableUseCase {
  constructor(private readonly tableRepository: FloorTableRepository) {}

  async execute(businessId: string, tableId: string, input: UpdateTableInput) {
    const existing = await this.tableRepository.findById(businessId, tableId);
    if (!existing) throw new TableNotFoundError();

    try {
      return await this.tableRepository.update(businessId, tableId, input);
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
