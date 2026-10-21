import { ReportRepository } from '../../domain/repositories/report.repository';
import { ListInvoicesFilters } from '../../domain/entities/report.entity';

export class ListInvoicesUseCase {
  constructor(private readonly reportRepository: ReportRepository) {}

  execute(businessId: string, filters: ListInvoicesFilters) {
    return this.reportRepository.listInvoices(businessId, filters);
  }
}
