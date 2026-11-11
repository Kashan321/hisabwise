import { menuModule } from '../../../menu/infrastructure/menu.module';
import { businessDayModule } from '../../../business-day/infrastructure/business-day.module';
import { tenantsModule } from '../../../tenants/infrastructure/tenants.module';

export class GetOfflineSnapshotUseCase {
  async execute(businessId: string) {
    const [business, menu, openBusinessDay] = await Promise.all([
      tenantsModule.getBusiness.execute(businessId),
      menuModule.getFullMenu.execute(businessId),
      businessDayModule.repository.findOpen(businessId),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      business,
      menu,
      businessDay: openBusinessDay
        ? {
            id: openBusinessDay.id,
            businessDate: openBusinessDay.businessDate,
            status: openBusinessDay.status,
          }
        : null,
    };
  }
}
