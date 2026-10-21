import { GetBusinessUseCase } from '../application/use-cases/get-business.use-case';
import { UpdateBusinessUseCase } from '../application/use-cases/update-business.use-case';
import { PrismaTenantBusinessRepository } from './persistence/prisma-business.repository';

const businessRepository = new PrismaTenantBusinessRepository();

export const tenantsModule = {
  getBusiness: new GetBusinessUseCase(businessRepository),
  updateBusiness: new UpdateBusinessUseCase(businessRepository),
};
