import {
  AvailabilitySlot,
  CreateReservationInput,
  ReservationEntity,
  ReservationStatus,
  UpdateReservationInput,
} from '../entities/reservation.entity';

export interface ReservationRepository {
  findAll(businessId: string, date?: Date, status?: ReservationStatus): Promise<ReservationEntity[]>;
  findById(businessId: string, reservationId: string): Promise<ReservationEntity | null>;
  create(businessId: string, input: CreateReservationInput): Promise<ReservationEntity>;
  update(
    businessId: string,
    reservationId: string,
    input: UpdateReservationInput,
  ): Promise<ReservationEntity>;
  updateStatus(
    businessId: string,
    reservationId: string,
    status: ReservationStatus,
  ): Promise<ReservationEntity>;
  getAvailability(
    businessId: string,
    date: Date,
    partySize: number,
  ): Promise<AvailabilitySlot[]>;
}
