import { prisma } from '../../../shared/database/prisma-client';

const DEFAULT_SETTINGS = {
  id: 'default',
};

export class FeedbackSettingsRepository {
  async getOrCreate() {
    const existing = await prisma.platformFeedbackSettings.findUnique({
      where: { id: 'default' },
    });
    if (existing) return existing;

    return prisma.platformFeedbackSettings.create({ data: DEFAULT_SETTINGS });
  }

  async update(data: {
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    websiteUrl?: string | null;
    supportHours?: string | null;
    extraNote?: string | null;
  }) {
    await this.getOrCreate();
    return prisma.platformFeedbackSettings.update({
      where: { id: 'default' },
      data,
    });
  }
}

export const feedbackSettingsRepository = new FeedbackSettingsRepository();
