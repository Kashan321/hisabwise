import { ReservationRepository } from '../../domain/repositories/reservation.repository';

export class GetAvailabilityUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  execute(businessId: string, date: Date, partySize: number) {
    return this.reservationRepository.getAvailability(businessId, date, partySize);
  }
}
