import { getPlatformPermissions } from '../../../../config/platform.constants';
import { PlatformUserNotFoundError } from '../../domain/errors/platform.errors';
import { PlatformUserRepository } from '../../domain/repositories/platform-user.repository';

export class GetCurrentPlatformUserUseCase {
  constructor(private readonly platformUserRepository: PlatformUserRepository) {}

  async execute(platformUserId: string) {
    const user = await this.platformUserRepository.findById(platformUserId);
    if (!user) {
      throw new PlatformUserNotFoundError();
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: getPlatformPermissions(user.role),
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
