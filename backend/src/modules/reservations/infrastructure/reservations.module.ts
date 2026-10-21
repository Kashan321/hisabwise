import { CreateReservationUseCase } from '../application/use-cases/create-reservation.use-case';
import { ListReservationsUseCase } from '../application/use-cases/list-reservations.use-case';
import { GetReservationUseCase } from '../application/use-cases/get-reservation.use-case';
import { UpdateReservationUseCase } from '../application/use-cases/update-reservation.use-case';
import { UpdateReservationStatusUseCase } from '../application/use-cases/update-reservation-status.use-case';
import { GetAvailabilityUseCase } from '../application/use-cases/get-availability.use-case';
import { PrismaReservationRepository } from './persistence/prisma-reservation.repository';

const reservationRepository = new PrismaReservationRepository();

export const reservationsModule = {
  createReservation: new CreateReservationUseCase(reservationRepository),
  listReservations: new ListReservationsUseCase(reservationRepository),
  getReservation: new GetReservationUseCase(reservationRepository),
  updateReservation: new UpdateReservationUseCase(reservationRepository),
  updateReservationStatus: new UpdateReservationStatusUseCase(reservationRepository),
  getAvailability: new GetAvailabilityUseCase(reservationRepository),
};
