import { getRawPrismaClient } from '../../../../shared/database/prisma-client';
import {
  PlatformRefreshTokenRecord,
  PlatformRefreshTokenRepository,
} from '../../domain/repositories/platform-refresh-token.repository';

export class PrismaPlatformRefreshTokenRepository implements PlatformRefreshTokenRepository {
  private readonly prisma = getRawPrismaClient();

  async create(input: {
    platformUserId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.platformRefreshToken.create({ data: input });
  }

  async findByTokenHash(tokenHash: string): Promise<PlatformRefreshTokenRecord | null> {
    return this.prisma.platformRefreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeById(id: string): Promise<void> {
    await this.prisma.platformRefreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.platformRefreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
