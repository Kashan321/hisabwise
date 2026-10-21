import { createHash } from 'crypto';
import { AUTH, ROLES } from '../../../../config/constants';
import { API_BASE_PATH } from '../../../../shared/http/project-info';
import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { BusinessRepository } from '../../domain/repositories/business.repository';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { UserRepository } from '../../domain/repositories/user.repository';
import { DuplicateEmailError, DuplicateSlugError } from '../../domain/errors/auth.errors';
import { BusinessSlug, Email, Password } from '../../domain/value-objects/email.vo';
import { PasswordHasherPort } from '../ports/password-hasher.port';
import { TokenServicePort } from '../ports/token-service.port';
import { RegisterUserInput, RegisterUserOutput } from '../dtos/register-user.dto';

export class RegisterUserUseCase {
  constructor(
    private readonly businessRepository: BusinessRepository,
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const email = Email.create(input.email);
    const password = Password.create(input.password);
    const slug = BusinessSlug.create(input.businessSlug);

    if (await this.businessRepository.slugExists(slug.value)) {
      throw new DuplicateSlugError();
    }

    if (await this.userRepository.emailExists(email.value)) {
      throw new DuplicateEmailError();
    }

    const business = await this.businessRepository.create(
      input.businessName.trim(),
      slug.value,
      {
        phone: input.phone.trim(),
        city: input.city.trim(),
        location: input.restaurantAddress.trim(),
        branchNumber: input.branchNumber.trim(),
      },
      {
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        backgroundColor: input.backgroundColor,
        textColor: input.textColor,
      },
    );
    const passwordHash = await this.passwordHasher.hash(password.value);

    let user;
    try {
      user = await this.userRepository.createWithRole({
        businessId: business.id,
        name: input.name.trim(),
        email: email.value,
        passwordHash,
        roleName: ROLES.OWNER,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new DuplicateEmailError();
      }
      throw error;
    }

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

    emitDomainEvent('user.registered', { userId: user.id, businessId: user.businessId });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessId: business.id,
        businessName: business.name,
        businessSlug: business.slug,
        roles: user.roles,
        permissions: user.permissions,
      },
      accessToken,
      refreshToken: refresh.token,
      refreshTokenExpiresAt,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function setRefreshCookieOptions(expiresAt: Date) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
    expires: expiresAt,
    path: `${API_BASE_PATH}/auth`,
    maxAge: AUTH.REFRESH_TOKEN_TTL_SECONDS * 1000,
  };
}
