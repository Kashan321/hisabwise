import { ROLES } from '../../../../config/constants';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';
import { StaffRepository } from '../../domain/repositories/staff.repository';
import { DuplicateEmailError, InvalidRoleError } from '../../domain/errors/staff.errors';

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

export interface CreateStaffCommand {
  businessId: string;
  actorRoles: string[];
  name: string;
  email: string;
  password: string;
  roleName: string;
}

export class CreateStaffUseCase {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(command: CreateStaffCommand) {
    this.assertRoleAssignmentAllowed(command.actorRoles, command.roleName);

    const passwordHash = await this.passwordHasher.hash(command.password);

    try {
      return await this.staffRepository.create({
        businessId: command.businessId,
        name: command.name.trim(),
        email: command.email.trim().toLowerCase(),
        passwordHash,
        roleName: command.roleName,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new DuplicateEmailError();
      }
      throw error;
    }
  }

  private assertRoleAssignmentAllowed(actorRoles: string[], roleName: string) {
    const isOwner = actorRoles.includes(ROLES.OWNER);
    const allowed: readonly string[] = isOwner ? ASSIGNABLE_BY_OWNER : ASSIGNABLE_BY_MANAGER;

    if (!allowed.includes(roleName)) {
      throw new InvalidRoleError(`You cannot assign the "${roleName}" role`);
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }
}
