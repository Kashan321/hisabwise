import { ReservationStatus } from '../../domain/entities/reservation.entity';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';

export class ListReservationsUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  execute(businessId: string, date?: Date, status?: ReservationStatus) {
    return this.reservationRepository.findAll(businessId, date, status);
  }
}
