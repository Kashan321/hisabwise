import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { CreateReservationInput } from '../../domain/entities/reservation.entity';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';

export class CreateReservationUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  async execute(businessId: string, input: CreateReservationInput) {
    const reservation = await this.reservationRepository.create(businessId, input);
    emitDomainEvent('reservation.created', { reservationId: reservation.id, businessId });
    return reservation;
  }
}
