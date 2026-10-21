import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { UnauthorizedError } from '../../domain/errors/auth.errors';
import { TokenServicePort } from '../ports/token-service.port';

export class LogoutUserUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token missing');
    }

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (storedToken && !storedToken.revokedAt) {
      await this.refreshTokenRepository.revokeFamily(storedToken.familyId);
    }
  }
}
