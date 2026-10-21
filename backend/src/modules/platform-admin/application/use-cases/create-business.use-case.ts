import { SubscriptionStatus } from '@prisma/client';
import { ROLES } from '../../../../config/constants';
import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { billingService } from '../../../billing/infrastructure/billing.service';
import { DuplicateEmailError, DuplicateSlugError } from '../../../auth/domain/errors/auth.errors';
import { BusinessRepository } from '../../../auth/domain/repositories/business.repository';
import { UserRepository } from '../../../auth/domain/repositories/user.repository';
import { BusinessSlug, Email, Password } from '../../../auth/domain/value-objects/email.vo';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';
import { PlatformAuditLogRepository } from '../../domain/repositories/platform-audit-log.repository';
import {
  BusinessDetail,
  PlatformBusinessRepository,
} from '../../domain/repositories/platform-business.repository';

export type CreateBusinessInput = {
  businessName: string;
  businessSlug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  subscriptionStatus?: SubscriptionStatus;
  trialDays?: number;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
};

export class CreateBusinessUseCase {
  constructor(
    private readonly tenantBusinessRepository: BusinessRepository,
    private readonly userRepository: UserRepository,
    private readonly platformBusinessRepository: PlatformBusinessRepository,
    private readonly auditLogRepository: PlatformAuditLogRepository,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(platformUserId: string, input: CreateBusinessInput): Promise<BusinessDetail> {
    const email = Email.create(input.ownerEmail);
    const password = Password.create(input.ownerPassword);
    const slug = BusinessSlug.create(input.businessSlug);

    if (await this.tenantBusinessRepository.slugExists(slug.value)) {
      throw new DuplicateSlugError();
    }

    if (await this.userRepository.emailExists(email.value)) {
      throw new DuplicateEmailError();
    }

    const business = await this.tenantBusinessRepository.create(
      input.businessName.trim(),
      slug.value,
      {
        phone: '0000000',
        city: '—',
        location: '—',
        branchNumber: '1',
      },
      {
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        backgroundColor: input.backgroundColor,
        textColor: input.textColor,
      },
    );

    const passwordHash = await this.passwordHasher.hash(password.value);

    try {
      const user = await this.userRepository.createWithRole({
        businessId: business.id,
        name: input.ownerName.trim(),
        email: email.value,
        passwordHash,
        roleName: ROLES.OWNER,
      });

      emitDomainEvent('user.registered', { userId: user.id, businessId: business.id });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new DuplicateEmailError();
      }
      throw error;
    }

    if (input.subscriptionStatus && input.subscriptionStatus !== 'TRIAL') {
      await this.platformBusinessRepository.updateSubscription(
        business.id,
        input.subscriptionStatus,
      );
    }

    if (input.trialDays && (!input.subscriptionStatus || input.subscriptionStatus === 'TRIAL')) {
      await billingService.setBusinessTrialDays(business.id, input.trialDays);
    }

    const created = await this.platformBusinessRepository.findById(business.id);
    if (!created) {
      throw new Error('Failed to load created business');
    }

    await this.auditLogRepository.create({
      platformUserId,
      action: 'business.created',
      targetType: 'business',
      targetId: business.id,
      metadata: { slug: business.slug, name: business.name },
    });

    return created;
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
