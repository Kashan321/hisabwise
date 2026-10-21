import { ReportRepository } from '../../domain/repositories/report.repository';
import { ReportDateRange } from '../../domain/entities/report.entity';

export class GetSalesSummaryUseCase {
  constructor(private readonly reportRepository: ReportRepository) {}

  execute(businessId: string, range: ReportDateRange) {
    return this.reportRepository.getSalesSummary(businessId, range);
  }
}
