import { prisma } from '../../../shared/database/prisma-client';
import { DEFAULT_BUSINESS_THEME } from '../../../shared/branding/default-theme';

const DEFAULT_SETTINGS = {
  id: 'default',
  primaryColor: DEFAULT_BUSINESS_THEME.primaryColor,
  secondaryColor: DEFAULT_BUSINESS_THEME.secondaryColor,
  backgroundColor: DEFAULT_BUSINESS_THEME.backgroundColor,
  textColor: DEFAULT_BUSINESS_THEME.textColor,
};

export class PlatformSettingsRepository {
  async getOrCreate() {
    const existing = await prisma.platformSettings.findUnique({
      where: { id: 'default' },
    });
    if (existing) return existing;

    return prisma.platformSettings.create({ data: DEFAULT_SETTINGS });
  }

  async update(data: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    calendlyUrl?: string | null;
  }) {
    await this.getOrCreate();
    return prisma.platformSettings.update({
      where: { id: 'default' },
      data,
    });
  }
}

export const platformSettingsRepository = new PlatformSettingsRepository();
