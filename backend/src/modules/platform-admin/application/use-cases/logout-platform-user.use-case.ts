import { TokenServicePort } from '../../../auth/application/ports/token-service.port';
import { PlatformUnauthorizedError } from '../../domain/errors/platform.errors';
import { PlatformRefreshTokenRepository } from '../../domain/repositories/platform-refresh-token.repository';

export class LogoutPlatformUserUseCase {
  constructor(
    private readonly refreshTokenRepository: PlatformRefreshTokenRepository,
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      throw new PlatformUnauthorizedError('Refresh token missing');
    }

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (storedToken) {
      await this.refreshTokenRepository.revokeById(storedToken.id);
    }
  }
}
