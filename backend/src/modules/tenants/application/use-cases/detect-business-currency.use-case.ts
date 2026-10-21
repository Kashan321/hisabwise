import { tenantsModule } from '../../infrastructure/tenants.module';
import { currencyFromCountry } from '../../../../shared/currency/country-currency';

export class DetectBusinessCurrencyUseCase {
  async execute(businessId: string, countryCode: string) {
    const business = await tenantsModule.getBusiness.execute(businessId);
    if (business.currency) {
      return business;
    }

    const currency = currencyFromCountry(countryCode);
    return tenantsModule.updateBusiness.execute(businessId, { currency });
  }
}

export const detectBusinessCurrencyUseCase = new DetectBusinessCurrencyUseCase();
