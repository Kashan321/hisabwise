import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import {
  UserAccountWithSlug,
  UserRepository,
} from '../../domain/repositories/user.repository';
import {
  InvalidCredentialsError,
  UserInactiveError,
  BusinessSuspendedError,
} from '../../domain/errors/auth.errors';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHasherPort } from '../ports/password-hasher.port';
import { TokenServicePort } from '../ports/token-service.port';
import { AuthUserOutput, LoginUserInput } from '../dtos/login-user.dto';
import { BusinessRepository } from '../../domain/repositories/business.repository';
import { UserWithRoles } from '../../domain/entities/user.entity';

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly businessRepository: BusinessRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute(input: LoginUserInput): Promise<AuthUserOutput & { businessSlug: string }> {
    const email = Email.create(input.email);

    let user: UserWithRoles;
    let businessSlug: string;

    if (input.businessSlug) {
      const found = await this.userRepository.findByEmailAndSlug(email.value, input.businessSlug);
      if (!found) {
        throw new InvalidCredentialsError();
      }

      const validPassword = await this.passwordHasher.verify(input.password, found.passwordHash);
      if (!validPassword) {
        throw new InvalidCredentialsError();
      }

      user = found;
      businessSlug = input.businessSlug;
    } else {
      const resolved = await this.resolveUserByEmail(email.value, input.password);
      user = resolved.user;
      businessSlug = resolved.businessSlug;
    }

    if (!user.isActive) {
      throw new UserInactiveError();
    }

    if (await this.businessRepository.isSuspended(user.businessId)) {
      throw new BusinessSuspendedError();
    }

    await this.userRepository.updateLastLogin(user.id);

    const refresh = this.tokenService.generateRefreshToken();
    const refreshTokenExpiresAt = this.tokenService.getRefreshTokenExpiresAt();

    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refresh.hash,
      familyId: refresh.familyId,
      expiresAt: refreshTokenExpiresAt,
    });

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      businessId: user.businessId,
      roles: user.roles,
      permissions: user.permissions,
    });

    emitDomainEvent('user.logged_in', { userId: user.id, businessId: user.businessId });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessId: user.businessId,
        businessSlug,
        roles: user.roles,
        permissions: user.permissions,
      },
      accessToken,
      refreshToken: refresh.token,
      refreshTokenExpiresAt,
      businessSlug,
    };
  }

  private async resolveUserByEmail(
    email: string,
    password: string,
  ): Promise<{ user: UserWithRoles; businessSlug: string }> {
    const accounts = await this.userRepository.findAccountsByEmail(email);
    if (accounts.length === 0) {
      throw new InvalidCredentialsError();
    }

    const matches: UserAccountWithSlug[] = [];

    for (const account of accounts) {
      if (!account.isActive) {
        continue;
      }

      if (await this.businessRepository.isSuspended(account.businessId)) {
        continue;
      }

      const validPassword = await this.passwordHasher.verify(password, account.passwordHash);
      if (validPassword) {
        matches.push(account);
      }
    }

    if (matches.length === 0) {
      throw new InvalidCredentialsError();
    }

    if (matches.length > 1) {
      matches.sort((a, b) => {
        const aTime = a.lastLoginAt?.getTime() ?? a.createdAt.getTime();
        const bTime = b.lastLoginAt?.getTime() ?? b.createdAt.getTime();
        return bTime - aTime;
      });
    }

    const match = matches[0];
    return { user: match, businessSlug: match.businessSlug };
  }
}
