import { RESERVATION_STATUS_TRANSITIONS } from '../../../../config/constants';
import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { ReservationStatus } from '../../domain/entities/reservation.entity';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';
import {
  InvalidReservationStatusError,
  ReservationNotFoundError,
} from '../../domain/errors/reservation.errors';

export class UpdateReservationStatusUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  async execute(businessId: string, reservationId: string, status: ReservationStatus) {
    const reservation = await this.reservationRepository.findById(businessId, reservationId);
    if (!reservation) throw new ReservationNotFoundError();

    const allowed = RESERVATION_STATUS_TRANSITIONS[reservation.status] ?? [];
    if (!allowed.includes(status)) {
      throw new InvalidReservationStatusError(
        `Cannot transition reservation from ${reservation.status} to ${status}`,
      );
    }

    const updated = await this.reservationRepository.updateStatus(businessId, reservationId, status);

    if (status === 'CANCELLED') {
      emitDomainEvent('reservation.cancelled', { reservationId: updated.id, businessId });
    }

    return updated;
  }
}
