import { UserRepository } from '../../domain/repositories/user.repository';
import { BusinessRepository } from '../../domain/repositories/business.repository';
import { BusinessSuspendedError, UnauthorizedError } from '../../domain/errors/auth.errors';

export class GetCurrentUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly businessRepository: BusinessRepository,
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (await this.businessRepository.isSuspended(user.businessId)) {
      throw new BusinessSuspendedError();
    }

    const businessSlug = await this.businessRepository.findSlugById(user.businessId);
    const { prisma } = await import('../../../../shared/database/prisma-client');
    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
      select: { name: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      businessId: user.businessId,
      businessSlug: businessSlug ?? '',
      businessName: business?.name ?? '',
      roles: user.roles,
      permissions: user.permissions,
    };
  }
}
