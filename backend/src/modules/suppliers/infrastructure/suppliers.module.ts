import { prismaSupplierRepository } from './persistence/prisma-supplier.repository';

export const suppliersModule = {
  list: (businessId: string, includeInactive?: boolean) =>
    prismaSupplierRepository.list(businessId, includeInactive),
  get: (businessId: string, supplierId: string) =>
    prismaSupplierRepository.get(businessId, supplierId),
  getLedger: (businessId: string, supplierId: string) =>
    prismaSupplierRepository.getLedger(businessId, supplierId),
  create: (businessId: string, input: Parameters<typeof prismaSupplierRepository.create>[1]) =>
    prismaSupplierRepository.create(businessId, input),
  update: (
    businessId: string,
    supplierId: string,
    input: Parameters<typeof prismaSupplierRepository.update>[2],
  ) => prismaSupplierRepository.update(businessId, supplierId, input),
  recordPayment: (
    businessId: string,
    supplierId: string,
    userId: string,
    input: Parameters<typeof prismaSupplierRepository.recordPayment>[3],
  ) => prismaSupplierRepository.recordPayment(businessId, supplierId, userId, input),
};
