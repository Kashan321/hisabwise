import { ReportRepository } from '../../domain/repositories/report.repository';
import { ReportDateRange } from '../../domain/entities/report.entity';

export class GetDailyRevenueUseCase {
  constructor(private readonly reportRepository: ReportRepository) {}

  execute(businessId: string, range: ReportDateRange) {
    return this.reportRepository.getDailyRevenue(businessId, range);
  }
}
