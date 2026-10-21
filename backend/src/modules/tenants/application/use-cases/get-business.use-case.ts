import { withResolvedBusinessTheme } from '../../../../shared/branding/default-theme';
import { platformSettingsRepository } from '../../../platform-admin/infrastructure/platform-settings.repository';
import { BusinessRepository } from '../../domain/repositories/business.repository';
import { BusinessNotFoundError } from '../../domain/errors/tenant.errors';

export class GetBusinessUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  async execute(businessId: string) {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new BusinessNotFoundError();
    }
    const platform = await platformSettingsRepository.getOrCreate();
    return withResolvedBusinessTheme(business, platform);
  }
}
