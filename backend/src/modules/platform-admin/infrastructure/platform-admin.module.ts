import { CreateBusinessUseCase } from '../application/use-cases/create-business.use-case';
import { LoginPlatformUserUseCase } from '../application/use-cases/login-platform-user.use-case';
import { RefreshPlatformTokenUseCase } from '../application/use-cases/refresh-platform-token.use-case';
import { LogoutPlatformUserUseCase } from '../application/use-cases/logout-platform-user.use-case';
import { GetCurrentPlatformUserUseCase } from '../application/use-cases/get-current-platform-user.use-case';
import {
  CreatePlatformAdminUseCase,
  DeleteBusinessUseCase,
  GetBusinessUseCase,
  GetPlatformMetricsUseCase,
  ListAuditLogsUseCase,
  ListBusinessesUseCase,
  ListPlatformAdminsUseCase,
  BlockBusinessSubscriptionUseCase,
  UnblockBusinessSubscriptionUseCase,
  ReactivateBusinessUseCase,
  SuspendBusinessUseCase,
  UpdateBusinessSubscriptionUseCase,
  UpdatePlatformAdminUseCase,
} from '../application/use-cases/platform-management.use-cases';
import {
  GetPlatformTenantAnalyticsDetailUseCase,
  ListPlatformTenantAnalyticsUseCase,
} from '../application/use-cases/platform-tenant-analytics.use-cases';
import { Argon2PasswordHasher } from '../../auth/infrastructure/security/argon2-password-hasher';
import { JwtTokenService } from '../../auth/infrastructure/security/jwt-token.service';
import { PrismaBusinessRepository } from '../../auth/infrastructure/persistence/prisma-business.repository';
import { PrismaUserRepository } from '../../auth/infrastructure/persistence/prisma-user.repository';
import { PrismaPlatformAuditLogRepository } from './persistence/prisma-platform-audit-log.repository';
import {
  PrismaPlatformBusinessRepository,
  PrismaPlatformMetricsRepository,
} from './persistence/prisma-platform-business.repository';
import { PrismaPlatformRefreshTokenRepository } from './persistence/prisma-platform-refresh-token.repository';
import { PrismaPlatformUserRepository } from './persistence/prisma-platform-user.repository';

const platformUserRepository = new PrismaPlatformUserRepository();
const refreshTokenRepository = new PrismaPlatformRefreshTokenRepository();
const businessRepository = new PrismaPlatformBusinessRepository();
const tenantBusinessRepository = new PrismaBusinessRepository();
const tenantUserRepository = new PrismaUserRepository();
const metricsRepository = new PrismaPlatformMetricsRepository();
const auditLogRepository = new PrismaPlatformAuditLogRepository();
const passwordHasher = new Argon2PasswordHasher();
const tokenService = new JwtTokenService();

export const platformAdminModule = {
  loginPlatformUser: new LoginPlatformUserUseCase(
    platformUserRepository,
    refreshTokenRepository,
    passwordHasher,
    tokenService,
  ),
  refreshPlatformToken: new RefreshPlatformTokenUseCase(
    platformUserRepository,
    refreshTokenRepository,
    tokenService,
  ),
  logoutPlatformUser: new LogoutPlatformUserUseCase(refreshTokenRepository, tokenService),
  getCurrentPlatformUser: new GetCurrentPlatformUserUseCase(platformUserRepository),
  listBusinesses: new ListBusinessesUseCase(businessRepository),
  createBusiness: new CreateBusinessUseCase(
    tenantBusinessRepository,
    tenantUserRepository,
    businessRepository,
    auditLogRepository,
    passwordHasher,
  ),
  getBusiness: new GetBusinessUseCase(businessRepository),
  updateBusinessSubscription: new UpdateBusinessSubscriptionUseCase(
    businessRepository,
    auditLogRepository,
  ),
  suspendBusiness: new SuspendBusinessUseCase(businessRepository, auditLogRepository),
  reactivateBusiness: new ReactivateBusinessUseCase(businessRepository, auditLogRepository),
  blockBusinessSubscription: new BlockBusinessSubscriptionUseCase(
    businessRepository,
    auditLogRepository,
  ),
  unblockBusinessSubscription: new UnblockBusinessSubscriptionUseCase(
    businessRepository,
    auditLogRepository,
  ),
  deleteBusiness: new DeleteBusinessUseCase(businessRepository, auditLogRepository),
  getPlatformMetrics: new GetPlatformMetricsUseCase(metricsRepository),
  listPlatformAdmins: new ListPlatformAdminsUseCase(platformUserRepository),
  createPlatformAdmin: new CreatePlatformAdminUseCase(
    platformUserRepository,
    auditLogRepository,
    passwordHasher,
  ),
  updatePlatformAdmin: new UpdatePlatformAdminUseCase(
    platformUserRepository,
    auditLogRepository,
  ),
  listAuditLogs: new ListAuditLogsUseCase(auditLogRepository),
  listTenantAnalytics: new ListPlatformTenantAnalyticsUseCase(),
  getTenantAnalyticsDetail: new GetPlatformTenantAnalyticsDetailUseCase(),
};
