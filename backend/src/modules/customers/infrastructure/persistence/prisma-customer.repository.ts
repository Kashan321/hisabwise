import { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import {
  CreateCustomerInput,
  CustomerEntity,
  LoyaltyPointsInput,
  LoyaltyTransactionEntity,
  UpdateCustomerInput,
} from '../../domain/entities/customer.entity';
import { CustomerRepository } from '../../domain/repositories/customer.repository';
import {
  CustomerNotFoundError,
  DuplicateCustomerError,
  InsufficientLoyaltyPointsError,
} from '../../domain/errors/customer.errors';

function mapCustomer(customer: {
  id: string;
  businessId: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  deliveryAddress: string | null;
  loyaltyPoints: number;
  createdAt: Date;
  updatedAt: Date;
}): CustomerEntity {
  return { ...customer };
}

function mapTransaction(transaction: {
  id: string;
  businessId: string;
  customerId: string;
  type: 'EARN' | 'REDEEM' | 'ADJUST';
  points: number;
  reason: string | null;
  orderId: string | null;
  createdAt: Date;
}): LoyaltyTransactionEntity {
  return transaction;
}

export class PrismaCustomerRepository implements CustomerRepository {
  async findAll(businessId: string, search?: string): Promise<CustomerEntity[]> {
    const where: Prisma.CustomerProfileWhereInput = { businessId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { deliveryAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customerProfile.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return customers.map(mapCustomer);
  }

  async findById(businessId: string, customerId: string): Promise<CustomerEntity | null> {
    const customer = await prisma.customerProfile.findFirst({
      where: { id: customerId, businessId },
    });
    return customer ? mapCustomer(customer) : null;
  }

  async create(businessId: string, input: CreateCustomerInput): Promise<CustomerEntity> {
    try {
      const customer = await prisma.customerProfile.create({
        data: {
          businessId,
          name: input.name,
          email: input.email,
          phoneNumber: input.phoneNumber,
          deliveryAddress: input.deliveryAddress,
        },
      });
      return mapCustomer(customer);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateCustomerError();
      }
      throw error;
    }
  }

  async update(
    businessId: string,
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<CustomerEntity> {
    const existing = await prisma.customerProfile.findFirst({ where: { id: customerId, businessId } });
    if (!existing) throw new CustomerNotFoundError();

    try {
      const customer = await prisma.customerProfile.update({
        where: { id: customerId },
        data: input,
      });
      return mapCustomer(customer);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateCustomerError();
      }
      throw error;
    }
  }

  async earnPoints(
    businessId: string,
    customerId: string,
    input: LoyaltyPointsInput,
  ): Promise<CustomerEntity> {
    const customer = await prisma.$transaction(async (tx) => {
      const existing = await tx.customerProfile.findFirst({ where: { id: customerId, businessId } });
      if (!existing) throw new CustomerNotFoundError();

      await tx.loyaltyTransaction.create({
        data: {
          businessId,
          customerId,
          type: 'EARN',
          points: input.points,
          reason: input.reason,
          orderId: input.orderId,
        },
      });

      return tx.customerProfile.update({
        where: { id: customerId },
        data: { loyaltyPoints: { increment: input.points } },
      });
    });

    return mapCustomer(customer);
  }

  async redeemPoints(
    businessId: string,
    customerId: string,
    input: LoyaltyPointsInput,
  ): Promise<CustomerEntity> {
    const customer = await prisma.$transaction(async (tx) => {
      const existing = await tx.customerProfile.findFirst({ where: { id: customerId, businessId } });
      if (!existing) throw new CustomerNotFoundError();
      if (existing.loyaltyPoints < input.points) throw new InsufficientLoyaltyPointsError();

      await tx.loyaltyTransaction.create({
        data: {
          businessId,
          customerId,
          type: 'REDEEM',
          points: input.points,
          reason: input.reason,
          orderId: input.orderId,
        },
      });

      return tx.customerProfile.update({
        where: { id: customerId },
        data: { loyaltyPoints: { decrement: input.points } },
      });
    });

    return mapCustomer(customer);
  }

  async listLoyaltyHistory(businessId: string, customerId: string) {
    const existing = await prisma.customerProfile.findFirst({ where: { id: customerId, businessId } });
    if (!existing) throw new CustomerNotFoundError();

    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { businessId, customerId },
      orderBy: { createdAt: 'desc' },
    });
    return transactions.map(mapTransaction);
  }
}
