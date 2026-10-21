import { PrismaInventoryDailyRepository } from './persistence/prisma-inventory-daily.repository';

const repository = new PrismaInventoryDailyRepository();

export class GetCurrentInventoryDailySessionUseCase {
  execute(businessId: string) {
    return repository.findOpenSession(businessId);
  }
}

export class ListInventoryDailySessionsUseCase {
  execute(businessId: string, limit?: number) {
    return repository.listSessions(businessId, limit);
  }
}

export class GetInventoryDailySessionUseCase {
  execute(businessId: string, sessionId: string) {
    return repository.getSession(businessId, sessionId);
  }
}

export class GetInventoryDailySessionSummaryUseCase {
  execute(businessId: string, sessionId: string) {
    return repository.getSessionSummary(businessId, sessionId);
  }
}

export class OpenInventoryDailySessionUseCase {
  execute(
    businessId: string,
    userId: string,
    input: { sessionDate?: string; shiftName?: string; openingNotes?: string },
  ) {
    return repository.openSession(businessId, userId, input);
  }
}

export class CloseInventoryDailySessionUseCase {
  execute(
    businessId: string,
    sessionId: string,
    userId: string,
    input: {
      lines: Array<{ inventoryItemId: string; actualClosingQuantity: number }>;
      closingNotes?: string;
    },
  ) {
    return repository.closeSession(businessId, sessionId, userId, input);
  }
}

export class RecordInventoryPurchaseUseCase {
  execute(
    businessId: string,
    sessionId: string,
    userId: string,
    input: {
      inventoryItemId: string;
      quantity: number;
      unitCost?: number;
      supplier?: string;
      supplierId?: string;
      invoiceRef?: string;
      notes?: string;
      purchasedAt?: string;
    },
  ) {
    return repository.recordPurchase(businessId, sessionId, userId, input);
  }
}

export class RecordInventoryWastageUseCase {
  execute(
    businessId: string,
    sessionId: string,
    userId: string,
    input: {
      inventoryItemId: string;
      quantity: number;
      reason: import('@prisma/client').InventoryWastageReason;
      notes?: string;
    },
  ) {
    return repository.recordWastage(businessId, sessionId, userId, input);
  }
}

export class RecordInventoryDailyAdjustmentUseCase {
  execute(
    businessId: string,
    sessionId: string,
    userId: string,
    input: {
      inventoryItemId: string;
      quantityDelta: number;
      note?: string;
    },
  ) {
    return repository.recordAdjustment(businessId, sessionId, userId, input);
  }
}

export class ListInventoryDailyMovementsUseCase {
  execute(businessId: string, sessionId: string, limit?: number) {
    return repository.listSessionMovements(businessId, sessionId, limit);
  }
}

export class GetInventoryDailyDashboardUseCase {
  async execute(businessId: string) {
    const open = await repository.findOpenSession(businessId);
    if (open) {
      const summary = await repository.getSessionSummary(businessId, open.id);
      return { mode: 'open' as const, ...summary };
    }

    const sessions = await repository.listSessions(businessId, 1);
    if (sessions.length === 0) {
      return { mode: 'none' as const };
    }

    const summary = await repository.getSessionSummary(businessId, sessions[0].id);
    return { mode: 'closed' as const, ...summary };
  }
}

export const inventoryDailyModule = {
  getCurrent: new GetCurrentInventoryDailySessionUseCase(),
  list: new ListInventoryDailySessionsUseCase(),
  get: new GetInventoryDailySessionUseCase(),
  getSummary: new GetInventoryDailySessionSummaryUseCase(),
  getDashboard: new GetInventoryDailyDashboardUseCase(),
  open: new OpenInventoryDailySessionUseCase(),
  close: new CloseInventoryDailySessionUseCase(),
  recordPurchase: new RecordInventoryPurchaseUseCase(),
  recordWastage: new RecordInventoryWastageUseCase(),
  recordAdjustment: new RecordInventoryDailyAdjustmentUseCase(),
  listMovements: new ListInventoryDailyMovementsUseCase(),
  repository,
};
