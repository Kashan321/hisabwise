import { getPlatformPermissions } from '../../../../config/platform.constants';
import { TokenServicePort } from '../../../auth/application/ports/token-service.port';
import {
  PlatformUnauthorizedError,
  PlatformUserInactiveError,
  PlatformUserNotFoundError,
} from '../../domain/errors/platform.errors';
import { PlatformRefreshTokenRepository } from '../../domain/repositories/platform-refresh-token.repository';
import { PlatformUserRepository } from '../../domain/repositories/platform-user.repository';
import { PlatformAuthOutput } from './login-platform-user.use-case';

export class RefreshPlatformTokenUseCase {
  constructor(
    private readonly platformUserRepository: PlatformUserRepository,
    private readonly refreshTokenRepository: PlatformRefreshTokenRepository,
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute(refreshToken: string | undefined): Promise<PlatformAuthOutput> {
    if (!refreshToken) {
      throw new PlatformUnauthorizedError('Refresh token missing');
    }

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken) {
      throw new PlatformUnauthorizedError('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      await this.refreshTokenRepository.revokeFamily(storedToken.familyId);
      throw new PlatformUnauthorizedError('Refresh token reused');
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await this.refreshTokenRepository.revokeById(storedToken.id);
      throw new PlatformUnauthorizedError('Refresh token expired');
    }

    const user = await this.platformUserRepository.findById(storedToken.platformUserId);
    if (!user) {
      throw new PlatformUserNotFoundError();
    }

    if (!user.isActive) {
      throw new PlatformUserInactiveError();
    }

    await this.refreshTokenRepository.revokeById(storedToken.id);

    const refresh = this.tokenService.generateRefreshToken();
    const refreshTokenExpiresAt = this.tokenService.getRefreshTokenExpiresAt();

    await this.refreshTokenRepository.create({
      platformUserId: user.id,
      tokenHash: refresh.hash,
      familyId: storedToken.familyId,
      expiresAt: refreshTokenExpiresAt,
    });

    const permissions = getPlatformPermissions(user.role);
    const accessToken = this.tokenService.signPlatformAccessToken({
      scope: 'platform',
      sub: user.id,
      platformRole: user.role,
      permissions,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
      },
      accessToken,
      refreshToken: refresh.token,
      refreshTokenExpiresAt,
    };
  }
}
