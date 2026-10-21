export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SEATED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface ReservationEntity {
  id: string;
  businessId: string;
  tableId: string | null;
  tableIdentifier: string | null;
  customerId: string | null;
  customerName: string;
  customerContact: string | null;
  partySize: number;
  reservationTime: Date;
  status: ReservationStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReservationInput {
  tableId?: string;
  customerId?: string;
  customerName: string;
  customerContact?: string;
  partySize?: number;
  reservationTime: Date;
  notes?: string;
}

export interface UpdateReservationInput {
  tableId?: string | null;
  customerId?: string | null;
  customerName?: string;
  customerContact?: string | null;
  partySize?: number;
  reservationTime?: Date;
  notes?: string | null;
}

export interface AvailabilitySlot {
  time: string;
  availableTables: number;
}
