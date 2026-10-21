import { ReportRepository } from '../../domain/repositories/report.repository';
import { ReportDateRange } from '../../domain/entities/report.entity';

export class ExportInvoicesUseCase {
  constructor(private readonly reportRepository: ReportRepository) {}

  execute(businessId: string, range: ReportDateRange) {
    return this.reportRepository.exportInvoices(businessId, range);
  }
}
