import { ReportRepository } from '../../domain/repositories/report.repository';
import { ReportDateRange } from '../../domain/entities/report.entity';

export class GetPaymentBreakdownUseCase {
  constructor(private readonly reportRepository: ReportRepository) {}

  execute(businessId: string, range: ReportDateRange) {
    return this.reportRepository.getPaymentBreakdown(businessId, range);
  }
}
