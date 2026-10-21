import { Request, Response } from 'express';
import { z } from 'zod';
import { customersModule } from '../../infrastructure/customers.module';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { listCustomersQuerySchema } from './customers.validators';

type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;

export class CustomersController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const { search } = req.validatedQuery as ListCustomersQuery;
    const customers = await customersModule.listCustomers.execute(
      req.tenantContext!.businessId,
      search,
    );
    return success(res, { customers });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const customer = await customersModule.createCustomer.execute(
      req.tenantContext!.businessId,
      req.body,
    );
    return success(res, { customer }, 201);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const customer = await customersModule.getCustomer.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { customer });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const customer = await customersModule.updateCustomer.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { customer });
  });

  earnPoints = asyncHandler(async (req: Request, res: Response) => {
    const customer = await customersModule.earnLoyaltyPoints.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { customer });
  });

  redeemPoints = asyncHandler(async (req: Request, res: Response) => {
    const customer = await customersModule.redeemLoyaltyPoints.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { customer });
  });

  loyaltyHistory = asyncHandler(async (req: Request, res: Response) => {
    const transactions = await customersModule.listLoyaltyHistory.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { transactions });
  });
}

export const customersController = new CustomersController();
