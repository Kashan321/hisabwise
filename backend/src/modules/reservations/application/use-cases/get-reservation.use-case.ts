import { ReservationRepository } from '../../domain/repositories/reservation.repository';
import { ReservationNotFoundError } from '../../domain/errors/reservation.errors';

export class GetReservationUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  async execute(businessId: string, reservationId: string) {
    const reservation = await this.reservationRepository.findById(businessId, reservationId);
    if (!reservation) throw new ReservationNotFoundError();
    return reservation;
  }
}
