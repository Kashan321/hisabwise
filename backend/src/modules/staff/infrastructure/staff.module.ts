import { Argon2PasswordHasher } from '../../auth/infrastructure/security/argon2-password-hasher';
import { CreateStaffUseCase } from '../application/use-cases/create-staff.use-case';
import { DeleteStaffUseCase } from '../application/use-cases/delete-staff.use-case';
import { ListStaffUseCase } from '../application/use-cases/list-staff.use-case';
import { UpdateStaffUseCase } from '../application/use-cases/update-staff.use-case';
import { UpdateStaffStatusUseCase } from '../application/use-cases/update-staff-status.use-case';
import { PrismaStaffRepository } from './persistence/prisma-staff.repository';

const staffRepository = new PrismaStaffRepository();
const passwordHasher = new Argon2PasswordHasher();

export const staffModule = {
  createStaff: new CreateStaffUseCase(staffRepository, passwordHasher),
  listStaff: new ListStaffUseCase(staffRepository),
  updateStaff: new UpdateStaffUseCase(staffRepository, passwordHasher),
  updateStaffStatus: new UpdateStaffStatusUseCase(staffRepository),
  deleteStaff: new DeleteStaffUseCase(staffRepository),
};
