import {
  ReservationStatus as PrismaReservationStatus,
  TableStatus as PrismaTableStatus,
} from '@prisma/client';
import { RESERVATION } from '../../../../config/constants';
import { prisma } from '../../../../shared/database/prisma-client';
import {
  CreateReservationInput,
  ReservationEntity,
  ReservationStatus,
  UpdateReservationInput,
} from '../../domain/entities/reservation.entity';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';
import { ReservationNotFoundError, TableNotAvailableError } from '../../domain/errors/reservation.errors';
import { TableNotFoundError } from '../../../floor-plan/domain/errors/floor-plan.errors';

function mapReservation(reservation: {
  id: string;
  businessId: string;
  tableId: string | null;
  customerId: string | null;
  customerName: string;
  customerContact: string | null;
  partySize: number;
  reservationTime: Date;
  status: PrismaReservationStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  table: { tableIdentifier: string } | null;
}): ReservationEntity {
  return {
    id: reservation.id,
    businessId: reservation.businessId,
    tableId: reservation.tableId,
    tableIdentifier: reservation.table?.tableIdentifier ?? null,
    customerId: reservation.customerId,
    customerName: reservation.customerName,
    customerContact: reservation.customerContact,
    partySize: reservation.partySize,
    reservationTime: reservation.reservationTime,
    status: reservation.status as ReservationStatus,
    notes: reservation.notes,
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt,
  };
}

const include = { table: { select: { tableIdentifier: true } } } as const;

const ACTIVE_RESERVATION_STATUSES: PrismaReservationStatus[] = ['PENDING', 'CONFIRMED', 'SEATED'];

async function assertTableAvailable(
  businessId: string,
  tableId: string,
  reservationTime: Date,
  excludeReservationId?: string,
) {
  const table = await prisma.floorTable.findFirst({ where: { id: tableId, businessId } });
  if (!table) throw new TableNotFoundError();

  const windowStart = new Date(reservationTime.getTime() - RESERVATION.DEFAULT_DURATION_MINUTES * 60_000);
  const windowEnd = new Date(reservationTime.getTime() + RESERVATION.DEFAULT_DURATION_MINUTES * 60_000);

  const conflict = await prisma.reservation.findFirst({
    where: {
      businessId,
      tableId,
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      status: { in: ACTIVE_RESERVATION_STATUSES },
      reservationTime: { gte: windowStart, lte: windowEnd },
    },
  });

  if (conflict) throw new TableNotAvailableError();
}

export class PrismaReservationRepository implements ReservationRepository {
  async findAll(
    businessId: string,
    date?: Date,
    status?: ReservationStatus,
  ): Promise<ReservationEntity[]> {
    const where: Record<string, unknown> = { businessId };
    if (status) where.status = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.reservationTime = { gte: start, lte: end };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include,
      orderBy: { reservationTime: 'asc' },
    });
    return reservations.map(mapReservation);
  }

  async findById(businessId: string, reservationId: string): Promise<ReservationEntity | null> {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, businessId },
      include,
    });
    return reservation ? mapReservation(reservation) : null;
  }

  async create(businessId: string, input: CreateReservationInput): Promise<ReservationEntity> {
    if (input.tableId) {
      await assertTableAvailable(businessId, input.tableId, input.reservationTime);
    }

    const reservation = await prisma.reservation.create({
      data: {
        businessId,
        tableId: input.tableId,
        customerId: input.customerId,
        customerName: input.customerName,
        customerContact: input.customerContact,
        partySize: input.partySize ?? 2,
        reservationTime: input.reservationTime,
        notes: input.notes,
      },
      include,
    });

    return mapReservation(reservation);
  }

  async update(
    businessId: string,
    reservationId: string,
    input: UpdateReservationInput,
  ): Promise<ReservationEntity> {
    const existing = await prisma.reservation.findFirst({ where: { id: reservationId, businessId } });
    if (!existing) throw new ReservationNotFoundError();

    const nextTime = input.reservationTime ?? existing.reservationTime;
    const nextTableId = input.tableId === undefined ? existing.tableId : input.tableId;

    if (nextTableId) {
      await assertTableAvailable(businessId, nextTableId, nextTime, reservationId);
    }

    const reservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: input,
      include,
    });

    return mapReservation(reservation);
  }

  async updateStatus(
    businessId: string,
    reservationId: string,
    status: ReservationStatus,
  ): Promise<ReservationEntity> {
    const existing = await prisma.reservation.findFirst({ where: { id: reservationId, businessId } });
    if (!existing) throw new ReservationNotFoundError();

    const reservation = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: status as PrismaReservationStatus },
        include,
      });

      if (existing.tableId) {
        if (status === 'CONFIRMED') {
          await tx.floorTable.update({
            where: { id: existing.tableId },
            data: { status: PrismaTableStatus.RESERVED },
          });
        }

        if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(status)) {
          await tx.floorTable.update({
            where: { id: existing.tableId },
            data: { status: PrismaTableStatus.AVAILABLE },
          });
        }
      }

      return updated;
    });

    return mapReservation(reservation);
  }

  async getAvailability(businessId: string, date: Date, partySize: number) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const tables = await prisma.floorTable.findMany({
      where: { businessId, capacity: { gte: partySize } },
    });

    const reservations = await prisma.reservation.findMany({
      where: {
        businessId,
        status: { in: ACTIVE_RESERVATION_STATUSES },
        reservationTime: { gte: start, lte: end },
      },
    });

    const slots: { time: string; availableTables: number }[] = [];
    for (let hour = 9; hour <= 21; hour++) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, 0, 0, 0);

      const windowStart = new Date(slotTime.getTime() - RESERVATION.DEFAULT_DURATION_MINUTES * 60_000);
      const windowEnd = new Date(slotTime.getTime() + RESERVATION.DEFAULT_DURATION_MINUTES * 60_000);

      const bookedTableIds = new Set(
        reservations
          .filter((r) => r.reservationTime >= windowStart && r.reservationTime <= windowEnd && r.tableId)
          .map((r) => r.tableId as string),
      );

      const availableTables = tables.filter((table) => !bookedTableIds.has(table.id)).length;
      slots.push({ time: slotTime.toISOString(), availableTables });
    }

    return slots;
  }
}
