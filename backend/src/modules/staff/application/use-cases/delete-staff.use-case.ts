import { ROLES } from '../../../../config/constants';
import { StaffRepository } from '../../domain/repositories/staff.repository';
import {
  CannotModifySelfError,
  LastOwnerError,
  StaffNotFoundError,
} from '../../domain/errors/staff.errors';

export interface DeleteStaffCommand {
  businessId: string;
  actorId: string;
  staffId: string;
}

export class DeleteStaffUseCase {
  constructor(private readonly staffRepository: StaffRepository) {}

  async execute(command: DeleteStaffCommand) {
    if (command.actorId === command.staffId) {
      throw new CannotModifySelfError();
    }

    const staff = await this.staffRepository.findById(command.businessId, command.staffId);
    if (!staff) {
      throw new StaffNotFoundError();
    }

    if (staff.roles.includes(ROLES.OWNER)) {
      const ownerCount = await this.staffRepository.countOwners(command.businessId);
      if (ownerCount <= 1) {
        throw new LastOwnerError();
      }
    }

    await this.staffRepository.delete(command.businessId, command.staffId);
  }
}
