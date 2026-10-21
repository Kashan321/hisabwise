import { ROLES } from '../../../../config/constants';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';
import { StaffRepository } from '../../domain/repositories/staff.repository';
import {
  CannotModifySelfError,
  InvalidRoleError,
  LastOwnerError,
  StaffNotFoundError,
} from '../../domain/errors/staff.errors';

const ASSIGNABLE_BY_OWNER = [
  ROLES.OWNER,
  ROLES.MANAGER,
  ROLES.EMPLOYEE,
  ROLES.CHEF,
  ROLES.WAITER,
  ROLES.RIDER,
] as const;
const ASSIGNABLE_BY_MANAGER = [
  ROLES.MANAGER,
  ROLES.EMPLOYEE,
  ROLES.CHEF,
  ROLES.WAITER,
  ROLES.RIDER,
] as const;

export interface UpdateStaffCommand {
  businessId: string;
  actorId: string;
  actorRoles: string[];
  staffId: string;
  name?: string;
  roleName?: string;
  password?: string;
}

export class UpdateStaffUseCase {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(command: UpdateStaffCommand) {
    if (command.actorId === command.staffId) {
      throw new CannotModifySelfError();
    }

    const staff = await this.staffRepository.findById(command.businessId, command.staffId);
    if (!staff) {
      throw new StaffNotFoundError();
    }

    if (command.roleName) {
      this.assertRoleAssignmentAllowed(command.actorRoles, command.roleName);

      if (staff.roles.includes(ROLES.OWNER) && command.roleName !== ROLES.OWNER) {
        const ownerCount = await this.staffRepository.countOwners(command.businessId);
        if (ownerCount <= 1) {
          throw new LastOwnerError();
        }
      }
    }

    const passwordHash = command.password
      ? await this.passwordHasher.hash(command.password)
      : undefined;

    return this.staffRepository.update(command.businessId, command.staffId, {
      name: command.name,
      roleName: command.roleName,
      passwordHash,
    });
  }

  private assertRoleAssignmentAllowed(actorRoles: string[], roleName: string) {
    const isOwner = actorRoles.includes(ROLES.OWNER);
    const allowed: readonly string[] = isOwner ? ASSIGNABLE_BY_OWNER : ASSIGNABLE_BY_MANAGER;

    if (!allowed.includes(roleName)) {
      throw new InvalidRoleError(`You cannot assign the "${roleName}" role`);
    }
  }
}
