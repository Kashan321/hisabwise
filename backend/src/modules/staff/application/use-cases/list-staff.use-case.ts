import { StaffRepository } from '../../domain/repositories/staff.repository';

export class ListStaffUseCase {
  constructor(private readonly staffRepository: StaffRepository) {}

  async execute(businessId: string) {
    return this.staffRepository.findAllByBusiness(businessId);
  }
}
