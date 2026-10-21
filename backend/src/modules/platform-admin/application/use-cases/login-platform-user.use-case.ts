import { PlatformRole } from '@prisma/client';
import { getPlatformPermissions } from '../../../../config/platform.constants';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';
import { TokenServicePort } from '../../../auth/application/ports/token-service.port';
import {
  PlatformInvalidCredentialsError,
  PlatformUserInactiveError,
} from '../../domain/errors/platform.errors';
import { PlatformRefreshTokenRepository } from '../../domain/repositories/platform-refresh-token.repository';
import { PlatformUserRepository } from '../../domain/repositories/platform-user.repository';

export interface PlatformLoginInput {
  email: string;
  password: string;
}

export interface PlatformAuthOutput {
  user: {
    id: string;
    name: string;
    email: string;
    role: PlatformRole;
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export class LoginPlatformUserUseCase {
  constructor(
    private readonly platformUserRepository: PlatformUserRepository,
    private readonly refreshTokenRepository: PlatformRefreshTokenRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute(input: PlatformLoginInput): Promise<PlatformAuthOutput> {
    const user = await this.platformUserRepository.findByEmail(input.email.trim().toLowerCase());

    if (!user) {
      throw new PlatformInvalidCredentialsError();
    }

    if (!user.isActive) {
      throw new PlatformUserInactiveError();
    }

    const validPassword = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!validPassword) {
      throw new PlatformInvalidCredentialsError();
    }

    await this.platformUserRepository.updateLastLogin(user.id);

    const permissions = getPlatformPermissions(user.role);
    const refresh = this.tokenService.generateRefreshToken();
    const refreshTokenExpiresAt = this.tokenService.getRefreshTokenExpiresAt();

    await this.refreshTokenRepository.create({
      platformUserId: user.id,
      tokenHash: refresh.hash,
      familyId: refresh.familyId,
      expiresAt: refreshTokenExpiresAt,
    });

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
