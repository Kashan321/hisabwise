import { prisma } from '../../../../shared/database/prisma-client';
import { ROLES } from '../../../../config/constants';
import {
  CreateStaffInput,
  StaffMember,
  UpdateStaffInput,
} from '../../domain/entities/staff.entity';
import { StaffCannotDeleteError } from '../../domain/errors/staff.errors';
import { StaffRepository } from '../../domain/repositories/staff.repository';

const userInclude = {
  userRoles: {
    include: { role: true },
  },
} as const;

function mapStaff(user: {
  id: string;
  businessId: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  userRoles: Array<{ role: { name: string } }>;
}): StaffMember {
  return {
    id: user.id,
    businessId: user.businessId,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    roles: user.userRoles.map((ur) => ur.role.name),
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export class PrismaStaffRepository implements StaffRepository {
  async findAllByBusiness(businessId: string): Promise<StaffMember[]> {
    const users = await prisma.user.findMany({
      where: { businessId },
      include: userInclude,
      orderBy: { createdAt: 'asc' },
    });
    return users.map(mapStaff);
  }

  async findById(businessId: string, userId: string): Promise<StaffMember | null> {
    const user = await prisma.user.findFirst({
      where: { id: userId, businessId },
      include: userInclude,
    });
    return user ? mapStaff(user) : null;
  }

  async create(input: CreateStaffInput): Promise<StaffMember> {
    const role = await prisma.role.findFirst({
      where: { name: input.roleName, businessId: null, isSystem: true },
    });

    if (!role) {
      throw new Error(`System role "${input.roleName}" not found`);
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          businessId: input.businessId,
          name: input.name,
          email: input.email,
          passwordHash: input.passwordHash,
        },
      });

      await tx.userRole.create({
        data: {
          userId: created.id,
          roleId: role.id,
          businessId: input.businessId,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: userInclude,
      });
    });

    return mapStaff(user);
  }

  async update(
    businessId: string,
    userId: string,
    input: UpdateStaffInput,
  ): Promise<StaffMember> {
    const user = await prisma.$transaction(async (tx) => {
      const data: { name?: string; passwordHash?: string } = {};
      if (input.name) data.name = input.name;
      if (input.passwordHash) data.passwordHash = input.passwordHash;

      if (Object.keys(data).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data,
        });
      }

      if (input.roleName) {
        const role = await tx.role.findFirst({
          where: { name: input.roleName, businessId: null, isSystem: true },
        });

        if (!role) {
          throw new Error(`System role "${input.roleName}" not found`);
        }

        await tx.userRole.deleteMany({ where: { userId } });
        await tx.userRole.create({
          data: { userId, roleId: role.id, businessId },
        });
      }

      return tx.user.findFirstOrThrow({
        where: { id: userId, businessId },
        include: userInclude,
      });
    });

    return mapStaff(user);
  }

  async setActive(businessId: string, userId: string, isActive: boolean): Promise<StaffMember> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      include: userInclude,
    });

    if (user.businessId !== businessId) {
      throw new Error('Staff member not in business');
    }

    return mapStaff(user);
  }

  async countOwners(businessId: string): Promise<number> {
    return prisma.userRole.count({
      where: {
        businessId,
        role: { name: ROLES.OWNER, isSystem: true },
        user: { isActive: true },
      },
    });
  }

  async delete(businessId: string, userId: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, businessId },
      select: { id: true },
    });

    if (!user) {
      throw new Error('Staff member not in business');
    }

    try {
      await prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      if (this.isForeignKeyConstraintError(error)) {
        throw new StaffCannotDeleteError();
      }
      throw error;
    }
  }

  private isForeignKeyConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2003'
    );
  }
}
