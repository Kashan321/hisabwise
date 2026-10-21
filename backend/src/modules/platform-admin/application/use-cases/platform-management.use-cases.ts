import { PlatformRole, SubscriptionStatus } from '@prisma/client';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';
import {
  BusinessNotFoundError,
  CannotModifySuperAdminError,
  DuplicatePlatformEmailError,
  PlatformUserNotFoundError,
} from '../../domain/errors/platform.errors';
import { PlatformAuditLogRepository } from '../../domain/repositories/platform-audit-log.repository';
import {
  PlatformBusinessRepository,
  PlatformMetricsRepository,
} from '../../domain/repositories/platform-business.repository';
import { PlatformUserRepository } from '../../domain/repositories/platform-user.repository';

export class ListBusinessesUseCase {
  constructor(private readonly businessRepository: PlatformBusinessRepository) {}

  execute() {
    return this.businessRepository.list();
  }
}

export class GetBusinessUseCase {
  constructor(private readonly businessRepository: PlatformBusinessRepository) {}

  async execute(businessId: string) {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new BusinessNotFoundError();
    }
    return business;
  }
}

export class UpdateBusinessSubscriptionUseCase {
  constructor(
    private readonly businessRepository: PlatformBusinessRepository,
    private readonly auditLogRepository: PlatformAuditLogRepository,
  ) {}

  async execute(
    platformUserId: string,
    businessId: string,
    subscriptionStatus: SubscriptionStatus,
  ) {
    const existing = await this.businessRepository.findById(businessId);
    if (!existing) {
      throw new BusinessNotFoundError();
    }

    const business = await this.businessRepository.updateSubscription(
      businessId,
      subscriptionStatus,
    );

    await this.auditLogRepository.create({
      platformUserId,
      action: 'business.subscription.updated',
      targetType: 'business',
      targetId: businessId,
      metadata: {
        previousStatus: existing.subscriptionStatus,
        subscriptionStatus,
      },
    });

    return business;
  }
}

export class SuspendBusinessUseCase {
  constructor(
    private readonly businessRepository: PlatformBusinessRepository,
    private readonly auditLogRepository: PlatformAuditLogRepository,
  ) {}

  async execute(platformUserId: string, businessId: string) {
    const existing = await this.businessRepository.findById(businessId);
    if (!existing) {
      throw new BusinessNotFoundError();
    }

    const business = await this.businessRepository.setSuspended(businessId, true);

    await this.auditLogRepository.create({
      platformUserId,
      action: 'business.suspended',
      targetType: 'business',
      targetId: businessId,
    });

    return business;
  }
}

export class ReactivateBusinessUseCase {
  constructor(
    private readonly businessRepository: PlatformBusinessRepository,
    private readonly auditLogRepository: PlatformAuditLogRepository,
  ) {}

  async execute(platformUserId: string, businessId: string) {
    const existing = await this.businessRepository.findById(businessId);
    if (!existing) {
      throw new BusinessNotFoundError();
    }

    const business = await this.businessRepository.setSuspended(businessId, false);

    await this.auditLogRepository.create({
      platformUserId,
      action: 'business.reactivated',
      targetType: 'business',
      targetId: businessId,
    });

    return business;
  }
}

export class BlockBusinessSubscriptionUseCase {
  constructor(
    private readonly businessRepository: PlatformBusinessRepository,
    private readonly auditLogRepository: PlatformAuditLogRepository,
  ) {}

  async execute(platformUserId: string, businessId: string) {
    const existing = await this.businessRepository.findById(businessId);
    if (!existing) {
      throw new BusinessNotFoundError();
    }

    const business = await this.businessRepository.setSubscriptionBlocked(businessId, true);

    await this.auditLogRepository.create({
      platformUserId,
      action: 'business.subscription.blocked',
      targetType: 'business',
      targetId: businessId,
    });

    return business;
  }
}

export class UnblockBusinessSubscriptionUseCase {
  constructor(
    private readonly businessRepository: PlatformBusinessRepository,
    private readonly auditLogRepository: PlatformAuditLogRepository,
  ) {}

  async execute(platformUserId: string, businessId: string) {
    const existing = await this.businessRepository.findById(businessId);
    if (!existing) {
      throw new BusinessNotFoundError();
    }

    const business = await this.businessRepository.setSubscriptionBlocked(businessId, false);

    await this.auditLogRepository.create({
      platformUserId,
      action: 'business.subscription.unblocked',
      targetType: 'business',
      targetId: businessId,
    });

    return business;
  }
}

export class DeleteBusinessUseCase {
  constructor(
    private readonly businessRepository: PlatformBusinessRepository,
    private readonly auditLogRepository: PlatformAuditLogRepository,
  ) {}

  async execute(platformUserId: string, businessId: string) {
    const existing = await this.businessRepository.findById(businessId);
    if (!existing) {
      throw new BusinessNotFoundError();
    }

    await this.businessRepository.delete(businessId);

    await this.auditLogRepository.create({
      platformUserId,
      action: 'business.deleted',
      targetType: 'business',
      targetId: businessId,
      metadata: { slug: existing.slug, name: existing.name },
    });
  }
}

export class GetPlatformMetricsUseCase {
  constructor(private readonly metricsRepository: PlatformMetricsRepository) {}

  execute() {
    return this.metricsRepository.getMetrics();
  }
}

export class ListPlatformAdminsUseCase {
  constructor(private readonly platformUserRepository: PlatformUserRepository) {}

  async execute() {
    const users = await this.platformUserRepository.list();
    return users.map(({ passwordHash: _passwordHash, ...user }) => user);
  }
}

export class CreatePlatformAdminUseCase {
  constructor(
    private readonly platformUserRepository: PlatformUserRepository,
    private readonly auditLogRepository: PlatformAuditLogRepository,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(
    actorId: string,
    input: { name: string; email: string; password: string; role: PlatformRole },
  ) {
    const existing = await this.platformUserRepository.findByEmail(input.email);
    if (existing) {
      throw new DuplicatePlatformEmailError();
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.platformUserRepository.create({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash,
      role: input.role,
    });

    await this.auditLogRepository.create({
      platformUserId: actorId,
      action: 'platform_admin.created',
      targetType: 'platform_user',
      targetId: user.id,
      metadata: { role: user.role, email: user.email },
    });

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}

export class UpdatePlatformAdminUseCase {
  constructor(
    private readonly platformUserRepository: PlatformUserRepository,
    private readonly auditLogRepository: PlatformAuditLogRepository,
  ) {}

  async execute(
    actorId: string,
    platformUserId: string,
    input: { name?: string; role?: PlatformRole; isActive?: boolean },
  ) {
    const existing = await this.platformUserRepository.findById(platformUserId);
    if (!existing) {
      throw new PlatformUserNotFoundError();
    }

    if (
      existing.role === 'SUPER_ADMIN' &&
      input.isActive === false &&
      (await this.platformUserRepository.countByRole('SUPER_ADMIN')) <= 1
    ) {
      throw new CannotModifySuperAdminError();
    }

    const user = await this.platformUserRepository.update(platformUserId, input);

    await this.auditLogRepository.create({
      platformUserId: actorId,
      action: 'platform_admin.updated',
      targetType: 'platform_user',
      targetId: platformUserId,
      metadata: input,
    });

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}

export class ListAuditLogsUseCase {
  constructor(private readonly auditLogRepository: PlatformAuditLogRepository) {}

  execute(limit?: number) {
    return this.auditLogRepository.list(limit);
  }
}
