import { CreateCustomerUseCase } from '../application/use-cases/create-customer.use-case';
import { ListCustomersUseCase } from '../application/use-cases/list-customers.use-case';
import { GetCustomerUseCase } from '../application/use-cases/get-customer.use-case';
import { UpdateCustomerUseCase } from '../application/use-cases/update-customer.use-case';
import { EarnLoyaltyPointsUseCase } from '../application/use-cases/earn-loyalty-points.use-case';
import { RedeemLoyaltyPointsUseCase } from '../application/use-cases/redeem-loyalty-points.use-case';
import { ListLoyaltyHistoryUseCase } from '../application/use-cases/list-loyalty-history.use-case';
import { PrismaCustomerRepository } from './persistence/prisma-customer.repository';
import { registerLoyaltyListeners } from './listeners/loyalty.listeners';

const customerRepository = new PrismaCustomerRepository();

export const customersModule = {
  createCustomer: new CreateCustomerUseCase(customerRepository),
  listCustomers: new ListCustomersUseCase(customerRepository),
  getCustomer: new GetCustomerUseCase(customerRepository),
  updateCustomer: new UpdateCustomerUseCase(customerRepository),
  earnLoyaltyPoints: new EarnLoyaltyPointsUseCase(customerRepository),
  redeemLoyaltyPoints: new RedeemLoyaltyPointsUseCase(customerRepository),
  listLoyaltyHistory: new ListLoyaltyHistoryUseCase(customerRepository),
};

registerLoyaltyListeners(customersModule.earnLoyaltyPoints);
