import { prisma } from '../../../../shared/database/prisma-client';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import {
  CreateRefreshTokenInput,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';

function mapRefreshToken(token: {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}): RefreshTokenEntity {
  return {
    id: token.id,
    userId: token.userId,
    tokenHash: token.tokenHash,
    familyId: token.familyId,
    expiresAt: token.expiresAt,
    revokedAt: token.revokedAt,
    createdAt: token.createdAt,
  };
}

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  async create(input: CreateRefreshTokenInput): Promise<RefreshTokenEntity> {
    const token = await prisma.refreshToken.create({ data: input });
    return mapRefreshToken(token);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    const token = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    return token ? mapRefreshToken(token) : null;
  }

  async revokeById(id: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
