import type { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import { SupplierNameTakenError, SupplierNotFoundError } from '../../domain/errors/supplier.errors';

function dec(value: Prisma.Decimal | number | string): number {
  return Number(value);
}

function moneyStr(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function mapSupplier(row: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  openingBalanceOwed: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    openingBalanceOwed: moneyStr(dec(row.openingBalanceOwed)),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaSupplierRepository {
  private async balanceMaps(businessId: string) {
    const [purchaseGroups, paymentGroups] = await Promise.all([
      prisma.inventoryPurchase.groupBy({
        by: ['supplierId'],
        where: { businessId, supplierId: { not: null } },
        _sum: { totalCost: true },
        _count: { id: true },
      }),
      prisma.supplierPayment.groupBy({
        by: ['supplierId'],
        where: { businessId },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const purchasedBySupplier = new Map<string, { total: number; count: number }>();
    for (const row of purchaseGroups) {
      if (!row.supplierId) continue;
      purchasedBySupplier.set(row.supplierId, {
        total: row._sum.totalCost ? dec(row._sum.totalCost) : 0,
        count: row._count.id,
      });
    }

    const paidBySupplier = new Map<string, { total: number; count: number }>();
    for (const row of paymentGroups) {
      paidBySupplier.set(row.supplierId, {
        total: row._sum.amount ? dec(row._sum.amount) : 0,
        count: row._count.id,
      });
    }

    return { purchasedBySupplier, paidBySupplier };
  }

  private withBalances(
    supplier: ReturnType<typeof mapSupplier>,
    openingBalanceOwed: number,
    purchased: number,
    paid: number,
    purchaseCount: number,
    paymentCount: number,
  ) {
    const balanceDue = openingBalanceOwed + purchased - paid;
    return {
      ...supplier,
      totalPurchased: moneyStr(purchased),
      totalPaid: moneyStr(paid),
      balanceDue: moneyStr(balanceDue),
      purchaseCount,
      paymentCount,
    };
  }

  async list(businessId: string, includeInactive = false) {
    const suppliers = await prisma.supplier.findMany({
      where: { businessId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
    const { purchasedBySupplier, paidBySupplier } = await this.balanceMaps(businessId);

    return suppliers.map((s) => {
      const base = mapSupplier(s);
      const purchases = purchasedBySupplier.get(s.id) ?? { total: 0, count: 0 };
      const payments = paidBySupplier.get(s.id) ?? { total: 0, count: 0 };
      return this.withBalances(
        base,
        dec(s.openingBalanceOwed),
        purchases.total,
        payments.total,
        purchases.count,
        payments.count,
      );
    });
  }

  async get(businessId: string, supplierId: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    });
    if (!supplier) throw new SupplierNotFoundError();

    const { purchasedBySupplier, paidBySupplier } = await this.balanceMaps(businessId);
    const purchases = purchasedBySupplier.get(supplier.id) ?? { total: 0, count: 0 };
    const payments = paidBySupplier.get(supplier.id) ?? { total: 0, count: 0 };
    const base = mapSupplier(supplier);
    return this.withBalances(
      base,
      dec(supplier.openingBalanceOwed),
      purchases.total,
      payments.total,
      purchases.count,
      payments.count,
    );
  }

  async getLedger(businessId: string, supplierId: string) {
    await this.get(businessId, supplierId);

    const [purchases, payments] = await Promise.all([
      prisma.inventoryPurchase.findMany({
        where: { businessId, supplierId },
        include: {
          inventoryItem: { select: { name: true, unit: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { purchasedAt: 'desc' },
        take: 200,
      }),
      prisma.supplierPayment.findMany({
        where: { businessId, supplierId },
        include: { createdBy: { select: { name: true } } },
        orderBy: { paidAt: 'desc' },
        take: 200,
      }),
    ]);

    type LedgerRow = {
      id: string;
      type: 'PURCHASE' | 'PAYMENT';
      date: string;
      amount: string;
      direction: 'debit' | 'credit';
      label: string;
      reference: string | null;
      createdByName: string;
    };

    const rows: LedgerRow[] = [
      ...purchases.map((p) => ({
        id: p.id,
        type: 'PURCHASE' as const,
        date: p.purchasedAt.toISOString(),
        amount: moneyStr(p.totalCost ? dec(p.totalCost) : 0),
        direction: 'debit' as const,
        label: p.inventoryItem.name,
        reference: p.invoiceRef,
        createdByName: p.createdBy.name,
      })),
      ...payments.map((p) => ({
        id: p.id,
        type: 'PAYMENT' as const,
        date: p.paidAt.toISOString(),
        amount: moneyStr(dec(p.amount)),
        direction: 'credit' as const,
        label: p.method ? `Payment (${p.method})` : 'Payment to supplier',
        reference: p.reference,
        createdByName: p.createdBy.name,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const supplier = await this.get(businessId, supplierId);
    return { supplier, ledger: rows };
  }

  async create(
    businessId: string,
    input: {
      name: string;
      phone?: string;
      email?: string;
      notes?: string;
      openingBalanceOwed?: number;
    },
  ) {
    const name = input.name.trim();
    const existing = await prisma.supplier.findFirst({
      where: { businessId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new SupplierNameTakenError();

    const row = await prisma.supplier.create({
      data: {
        businessId,
        name,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        notes: input.notes?.trim() || null,
        openingBalanceOwed: input.openingBalanceOwed ?? 0,
      },
    });
    return this.get(businessId, row.id);
  }

  async update(
    businessId: string,
    supplierId: string,
    input: {
      name?: string;
      phone?: string | null;
      email?: string | null;
      notes?: string | null;
      openingBalanceOwed?: number;
      isActive?: boolean;
    },
  ) {
    const current = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    });
    if (!current) throw new SupplierNotFoundError();

    if (input.name && input.name.trim().toLowerCase() !== current.name.toLowerCase()) {
      const taken = await prisma.supplier.findFirst({
        where: {
          businessId,
          id: { not: supplierId },
          name: { equals: input.name.trim(), mode: 'insensitive' },
        },
      });
      if (taken) throw new SupplierNameTakenError();
    }

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
        ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        ...(input.openingBalanceOwed !== undefined
          ? { openingBalanceOwed: input.openingBalanceOwed }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    if (input.name) {
      await prisma.inventoryPurchase.updateMany({
        where: { businessId, supplierId },
        data: { supplier: input.name.trim() },
      });
    }

    return this.get(businessId, supplierId);
  }

  async recordPayment(
    businessId: string,
    supplierId: string,
    userId: string,
    input: {
      amount: number;
      paidAt?: string;
      method?: string;
      reference?: string;
      notes?: string;
    },
  ) {
    await this.get(businessId, supplierId);

    const payment = await prisma.supplierPayment.create({
      data: {
        businessId,
        supplierId,
        amount: input.amount,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
        method: input.method?.trim() || null,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        createdById: userId,
      },
      include: { createdBy: { select: { name: true } } },
    });

    return {
      id: payment.id,
      supplierId: payment.supplierId,
      amount: moneyStr(dec(payment.amount)),
      paidAt: payment.paidAt.toISOString(),
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
      createdByName: payment.createdBy.name,
      createdAt: payment.createdAt.toISOString(),
    };
  }
}

export const prismaSupplierRepository = new PrismaSupplierRepository();
