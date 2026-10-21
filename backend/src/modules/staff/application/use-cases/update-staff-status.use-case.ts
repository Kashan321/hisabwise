import { ROLES } from '../../../../config/constants';
import { StaffRepository } from '../../domain/repositories/staff.repository';
import {
  CannotModifySelfError,
  LastOwnerError,
  StaffNotFoundError,
} from '../../domain/errors/staff.errors';

export interface UpdateStaffStatusCommand {
  businessId: string;
  actorId: string;
  staffId: string;
  isActive: boolean;
}

export class UpdateStaffStatusUseCase {
  constructor(private readonly staffRepository: StaffRepository) {}

  async execute(command: UpdateStaffStatusCommand) {
    if (command.actorId === command.staffId) {
      throw new CannotModifySelfError();
    }

    const staff = await this.staffRepository.findById(command.businessId, command.staffId);
    if (!staff) {
      throw new StaffNotFoundError();
    }

    if (!command.isActive && staff.roles.includes(ROLES.OWNER)) {
      const ownerCount = await this.staffRepository.countOwners(command.businessId);
      if (ownerCount <= 1) {
        throw new LastOwnerError();
      }
    }

    return this.staffRepository.setActive(command.businessId, command.staffId, command.isActive);
  }
}
