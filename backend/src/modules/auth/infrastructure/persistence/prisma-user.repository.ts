import { prisma } from '../../../../shared/database/prisma-client';
import { UserWithRoles } from '../../domain/entities/user.entity';
import {
  CreateUserInput,
  UserAccountWithSlug,
  UserRepository,
} from '../../domain/repositories/user.repository';

function mapUserWithRoles(
  user: {
    id: string;
    businessId: string;
    name: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    userRoles: Array<{
      role: {
        name: string;
        rolePermissions: Array<{ permission: { key: string } }>;
      };
    }>;
  },
): UserWithRoles {
  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissionSet = new Set<string>();

  for (const userRole of user.userRoles) {
    for (const rp of userRole.role.rolePermissions) {
      permissionSet.add(rp.permission.key);
    }
  }

  return {
    id: user.id,
    businessId: user.businessId,
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    roles,
    permissions: Array.from(permissionSet),
  };
}

const userInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} as const;

export class PrismaUserRepository implements UserRepository {
  async findByEmail(businessId: string, email: string): Promise<UserWithRoles | null> {
    const user = await prisma.user.findFirst({
      where: { businessId, email },
      include: userInclude,
    });
    return user ? mapUserWithRoles(user) : null;
  }

  async findByEmailAndSlug(email: string, businessSlug: string): Promise<UserWithRoles | null> {
    const user = await prisma.user.findFirst({
      where: {
        email,
        business: { slug: businessSlug },
      },
      include: userInclude,
    });
    return user ? mapUserWithRoles(user) : null;
  }

  async findAccountsByEmail(email: string): Promise<UserAccountWithSlug[]> {
    const users = await prisma.user.findMany({
      where: { email },
      include: {
        ...userInclude,
        business: { select: { slug: true } },
      },
    });

    return users.map((user) => ({
      ...mapUserWithRoles(user),
      businessSlug: user.business.slug,
    }));
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  }

  async findById(userId: string): Promise<UserWithRoles | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: userInclude,
    });
    return user ? mapUserWithRoles(user) : null;
  }

  async createWithRole(input: CreateUserInput): Promise<UserWithRoles> {
    const role = await prisma.role.findFirst({
      where: { name: input.roleName, businessId: null, isSystem: true },
    });

    if (!role) {
      throw new Error(`System role "${input.roleName}" not found. Run database seed.`);
    }

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          businessId: input.businessId,
          name: input.name,
          email: input.email,
          passwordHash: input.passwordHash,
        },
      });

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: role.id,
          businessId: input.businessId,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: createdUser.id },
        include: userInclude,
      });
    });

    return mapUserWithRoles(user);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
