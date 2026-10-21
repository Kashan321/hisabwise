import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import {
  TokenExpiredError,
  TokenReusedError,
  UnauthorizedError,
  UserInactiveError,
  BusinessSuspendedError,
} from '../../domain/errors/auth.errors';
import { TokenServicePort } from '../ports/token-service.port';
import { AuthUserOutput } from '../dtos/login-user.dto';
import { BusinessRepository } from '../../domain/repositories/business.repository';

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute(refreshToken: string | undefined): Promise<AuthUserOutput> {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token missing');
    }

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      await this.refreshTokenRepository.revokeFamily(storedToken.familyId);
      throw new TokenReusedError();
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await this.refreshTokenRepository.revokeById(storedToken.id);
      throw new TokenExpiredError();
    }

    const user = await this.userRepository.findById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new UserInactiveError();
    }

    if (await this.businessRepository.isSuspended(user.businessId)) {
      throw new BusinessSuspendedError();
    }

    await this.refreshTokenRepository.revokeById(storedToken.id);

    const refresh = this.tokenService.generateRefreshToken();
    const refreshTokenExpiresAt = this.tokenService.getRefreshTokenExpiresAt();

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refresh.hash,
      familyId: storedToken.familyId,
      expiresAt: refreshTokenExpiresAt,
    });

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      businessId: user.businessId,
      roles: user.roles,
      permissions: user.permissions,
    });

    const businessSlug = await this.businessRepository.findSlugById(user.businessId);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessId: user.businessId,
        businessSlug: businessSlug ?? '',
        roles: user.roles,
        permissions: user.permissions,
      },
      accessToken,
      refreshToken: refresh.token,
      refreshTokenExpiresAt,
    };
  }
}
