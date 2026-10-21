import { prismaBusinessDayRepository } from './persistence/prisma-business-day.repository';

export class GetCurrentBusinessDayUseCase {
  execute(businessId: string) {
    return prismaBusinessDayRepository.getCurrentWithLifecycle(businessId);
  }
}

export class OpenBusinessDayUseCase {
  execute(businessId: string, userId: string) {
    return prismaBusinessDayRepository.open(businessId, userId);
  }
}

export class CloseBusinessDayUseCase {
  execute(businessId: string, businessDayId: string, userId: string) {
    return prismaBusinessDayRepository.close(businessId, businessDayId, userId);
  }
}

export class ListBusinessDaysUseCase {
  execute(businessId: string, options?: { limit?: number }) {
    return prismaBusinessDayRepository.list(businessId, options);
  }
}

export class GetBusinessDaySummaryUseCase {
  execute(businessId: string, businessDayId: string) {
    return prismaBusinessDayRepository.getSummary(businessId, businessDayId);
  }
}

export const businessDayModule = {
  getCurrent: new GetCurrentBusinessDayUseCase(),
  open: new OpenBusinessDayUseCase(),
  close: new CloseBusinessDayUseCase(),
  list: new ListBusinessDaysUseCase(),
  getSummary: new GetBusinessDaySummaryUseCase(),
  repository: prismaBusinessDayRepository,
};
