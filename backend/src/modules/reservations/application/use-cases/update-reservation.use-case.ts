import { UpdateReservationInput } from '../../domain/entities/reservation.entity';
import { ReservationRepository } from '../../domain/repositories/reservation.repository';
import { ReservationNotFoundError } from '../../domain/errors/reservation.errors';

export class UpdateReservationUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  async execute(businessId: string, reservationId: string, input: UpdateReservationInput) {
    const existing = await this.reservationRepository.findById(businessId, reservationId);
    if (!existing) throw new ReservationNotFoundError();
    return this.reservationRepository.update(businessId, reservationId, input);
  }
}
