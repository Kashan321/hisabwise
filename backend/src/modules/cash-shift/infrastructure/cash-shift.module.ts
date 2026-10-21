import { PrismaCashShiftRepository } from './persistence/prisma-cash-shift.repository';
import { riderCashSettlementRepository } from './persistence/rider-cash-settlement.repository';

const repository = new PrismaCashShiftRepository();

export class GetCurrentCashShiftUseCase {
  execute(businessId: string) {
    return repository.findOpenShift(businessId);
  }
}

export class OpenCashShiftUseCase {
  execute(businessId: string, userId: string, openingCash: number) {
    return repository.openShift(businessId, userId, openingCash);
  }
}

export class CloseCashShiftUseCase {
  execute(
    businessId: string,
    shiftId: string,
    userId: string,
    input: {
      actualCash: number;
      notes?: string;
      closingSettlement: string;
      transferredCash?: number;
      destinationAccountId?: string | null;
    },
  ) {
    return repository.closeShift(businessId, shiftId, userId, input);
  }
}

export class ListSettlementAccountsUseCase {
  execute(businessId: string) {
    return repository.listSettlementAccounts(businessId);
  }
}

export class AddCashDrawerMovementUseCase {
  execute(
    businessId: string,
    shiftId: string,
    type: 'PAY_IN' | 'PAY_OUT',
    amount: number,
    reason: string,
    userId: string,
  ) {
    return repository.addMovement(businessId, shiftId, type, amount, reason, userId);
  }
}

export class GetCashShiftSummaryUseCase {
  execute(businessId: string, shiftId: string) {
    return repository.getShiftSummary(businessId, shiftId);
  }
}

export class ListCashShiftsUseCase {
  execute(
    businessId: string,
    options?: { status?: 'OPEN' | 'CLOSED'; limit?: number },
  ) {
    return repository.listShifts(businessId, options);
  }
}

export class ListPendingRiderHandoffsUseCase {
  execute(businessId: string) {
    return riderCashSettlementRepository.listPendingGrouped(businessId);
  }
}

export class ListRiderPendingCashUseCase {
  execute(businessId: string, riderId: string) {
    return riderCashSettlementRepository.listPendingForRider(businessId, riderId);
  }
}

export class ConfirmRiderCashHandoffUseCase {
  execute(
    businessId: string,
    confirmedById: string,
    filter: { settlementId?: string; riderId?: string },
  ) {
    return riderCashSettlementRepository.confirm(businessId, confirmedById, filter);
  }
}

export const cashShiftModule = {
  getCurrent: new GetCurrentCashShiftUseCase(),
  open: new OpenCashShiftUseCase(),
  close: new CloseCashShiftUseCase(),
  addMovement: new AddCashDrawerMovementUseCase(),
  getSummary: new GetCashShiftSummaryUseCase(),
  list: new ListCashShiftsUseCase(),
  listPendingRiderHandoffs: new ListPendingRiderHandoffsUseCase(),
  listRiderPendingCash: new ListRiderPendingCashUseCase(),
  confirmRiderCashHandoff: new ConfirmRiderCashHandoffUseCase(),
  listSettlementAccounts: new ListSettlementAccountsUseCase(),
  repository,
  riderCashSettlementRepository,
};
