import { PlatformRole } from '@prisma/client';
import { getRawPrismaClient } from '../../../../shared/database/prisma-client';
import {
  CreatePlatformUserInput,
  PlatformUserRecord,
  PlatformUserRepository,
  UpdatePlatformUserInput,
} from '../../domain/repositories/platform-user.repository';

export class PrismaPlatformUserRepository implements PlatformUserRepository {
  private readonly prisma = getRawPrismaClient();

  async findByEmail(email: string): Promise<PlatformUserRecord | null> {
    return this.prisma.platformUser.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<PlatformUserRecord | null> {
    return this.prisma.platformUser.findUnique({ where: { id } });
  }

  async list(): Promise<PlatformUserRecord[]> {
    return this.prisma.platformUser.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async create(input: CreatePlatformUserInput): Promise<PlatformUserRecord> {
    return this.prisma.platformUser.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        role: input.role,
      },
    });
  }

  async update(id: string, input: UpdatePlatformUserInput): Promise<PlatformUserRecord> {
    return this.prisma.platformUser.update({
      where: { id },
      data: input,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.platformUser.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async countByRole(role: PlatformRole): Promise<number> {
    return this.prisma.platformUser.count({
      where: { role, isActive: true },
    });
  }
}
