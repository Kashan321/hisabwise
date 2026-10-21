import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { LogoutUserUseCase } from '../application/use-cases/logout-user.use-case';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';
import { PrismaBusinessRepository } from './persistence/prisma-business.repository';
import { PrismaUserRepository } from './persistence/prisma-user.repository';
import { PrismaRefreshTokenRepository } from './persistence/prisma-refresh-token.repository';
import { Argon2PasswordHasher } from './security/argon2-password-hasher';
import { JwtTokenService } from './security/jwt-token.service';

const businessRepository = new PrismaBusinessRepository();
const userRepository = new PrismaUserRepository();
const refreshTokenRepository = new PrismaRefreshTokenRepository();
const passwordHasher = new Argon2PasswordHasher();
const tokenService = new JwtTokenService();

export const authModule = {
  registerUser: new RegisterUserUseCase(
    businessRepository,
    userRepository,
    refreshTokenRepository,
    passwordHasher,
    tokenService,
  ),
  loginUser: new LoginUserUseCase(
    userRepository,
    businessRepository,
    refreshTokenRepository,
    passwordHasher,
    tokenService,
  ),
  refreshToken: new RefreshTokenUseCase(
    userRepository,
    businessRepository,
    refreshTokenRepository,
    tokenService,
  ),
  logoutUser: new LogoutUserUseCase(refreshTokenRepository, tokenService),
  getCurrentUser: new GetCurrentUserUseCase(userRepository, businessRepository),
  businessRepository,
  tokenService,
};

export type AuthModule = typeof authModule;
