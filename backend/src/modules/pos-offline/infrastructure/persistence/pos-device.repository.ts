import { prisma } from '../../../../shared/database/prisma-client';

const TICKET_PREFIX_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function pickTicketPrefix(ordinal: number): string {
  if (ordinal < TICKET_PREFIX_ALPHABET.length) {
    return TICKET_PREFIX_ALPHABET[ordinal]!;
  }
  const first = Math.floor(ordinal / TICKET_PREFIX_ALPHABET.length) - 1;
  const second = ordinal % TICKET_PREFIX_ALPHABET.length;
  return `${TICKET_PREFIX_ALPHABET[first]!}${TICKET_PREFIX_ALPHABET[second]!}`.slice(0, 3);
}

export class PosDeviceRepository {
  async findByDeviceKey(businessId: string, deviceKey: string) {
    return prisma.posDevice.findUnique({
      where: { businessId_deviceKey: { businessId, deviceKey } },
    });
  }

  async registerDevice(businessId: string, deviceKey: string, label?: string | null) {
    const existing = await this.findByDeviceKey(businessId, deviceKey);
    if (existing) {
      return prisma.posDevice.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date(),
          ...(label !== undefined ? { label } : {}),
        },
      });
    }

    const deviceCount = await prisma.posDevice.count({ where: { businessId } });
    const created = await prisma.posDevice.create({
      data: {
        businessId,
        deviceKey,
        ticketPrefix: pickTicketPrefix(deviceCount),
        label: label ?? null,
        lastSeenAt: new Date(),
      },
    });
    return created;
  }

  async bumpOfflineTicketCursor(deviceId: string, consumedThrough: number) {
    const device = await prisma.posDevice.findUnique({ where: { id: deviceId } });
    if (!device) return null;
    if (consumedThrough < device.nextOfflineTicketNumber) {
      return device;
    }
    return prisma.posDevice.update({
      where: { id: deviceId },
      data: { nextOfflineTicketNumber: consumedThrough + 1 },
    });
  }
}

export const posDeviceRepository = new PosDeviceRepository();
