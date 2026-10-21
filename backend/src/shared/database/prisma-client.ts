import { PrismaClient } from '@prisma/client';
import { getOptionalTenantContext } from '../tenant-context/tenant-context';

const TENANT_SCOPED_MODELS = new Set([
  'User',
  'UserRole',
  'MenuCategory',
  'MenuItem',
  'ModifierGroup',
  'FloorTable',
  'Order',
  'CustomerProfile',
  'Reservation',
  'Promotion',
  'NotificationLog',
  'LoyaltyTransaction',
  'InventoryItem',
  'InventoryRecipe',
  'InventoryMovement',
]);

function createExtendedClient(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const ctx = getOptionalTenantContext();
          if (ctx && TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, businessId: ctx.businessId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          const ctx = getOptionalTenantContext();
          if (ctx && TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, businessId: ctx.businessId };
          }
          return query(args);
        },
        async update({ model, args, query }) {
          const ctx = getOptionalTenantContext();
          if (ctx && TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, businessId: ctx.businessId };
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          const ctx = getOptionalTenantContext();
          if (ctx && TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, businessId: ctx.businessId };
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          const ctx = getOptionalTenantContext();
          if (ctx && TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, businessId: ctx.businessId };
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          const ctx = getOptionalTenantContext();
          if (ctx && TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, businessId: ctx.businessId };
          }
          return query(args);
        },
        async create({ model, args, query }) {
          const ctx = getOptionalTenantContext();
          if (ctx && TENANT_SCOPED_MODELS.has(model)) {
            const data = args.data as Record<string, unknown>;
            if (!data.businessId) {
              args.data = { ...data, businessId: ctx.businessId } as typeof args.data;
            }
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          const ctx = getOptionalTenantContext();
          if (ctx && TENANT_SCOPED_MODELS.has(model) && Array.isArray(args.data)) {
            args.data = args.data.map((item) => ({
              ...item,
              businessId: ctx.businessId,
            })) as typeof args.data;
          }
          return query(args);
        },
      },
    },
  });
}

export type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

function createPrismaClient(): ExtendedPrismaClient {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  return createExtendedClient(base);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export function getRawPrismaClient(): PrismaClient {
  return prisma as unknown as PrismaClient;
}
