import { BusinessRepository } from '../../domain/repositories/business.repository';
import { UpdateBusinessInput } from '../../domain/entities/business.entity';
import { BusinessNotFoundError } from '../../domain/errors/tenant.errors';

export class UpdateBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  async execute(businessId: string, input: UpdateBusinessInput) {
    const existing = await this.businessRepository.findById(businessId);
    if (!existing) {
      throw new BusinessNotFoundError();
    }

    return this.businessRepository.update(businessId, input);
  }
}
