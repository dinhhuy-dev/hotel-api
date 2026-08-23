import type { EntityManager } from 'typeorm';
import { ReservationStatus } from '../../entities/enum/reservation-status';
import { ReservationItem } from '../../entities/reservation-item.entity';
import { Reservation } from '../../entities/reservation.entity';
import { RoomAssignment } from '../../entities/room-assignment.entity';

export interface ReservationListOptions {
  readonly page: number;
  readonly limit: number;
  readonly customerId?: string;
  readonly status?: ReservationStatus;
  readonly checkInDate?: string;
  readonly checkOutDate?: string;
}

export interface ReservationListResult {
  readonly items: Reservation[];
  readonly totalItems: number;
}

export interface RoomTypeCommitment {
  readonly roomTypeId: string;
  readonly quantity: number;
}

export interface BookingRepositoryPort {
  findCommittedQuantities(
    roomTypeIds: readonly string[],
    checkInDate: string,
    checkOutDate: string,
    now: Date,
    manager?: EntityManager,
  ): Promise<RoomTypeCommitment[]>;
  findByIdempotencyKey(idempotencyKey: string, manager: EntityManager): Promise<Reservation | null>;
  findWithDetailsById(id: string, manager: EntityManager): Promise<Reservation | null>;
  findPage(options: ReservationListOptions, manager: EntityManager): Promise<ReservationListResult>;
  findAndLockById(id: string, manager: EntityManager): Promise<Reservation | null>;
  saveReservation(reservation: Reservation, manager: EntityManager): Promise<Reservation>;
  saveReservationItems(
    items: readonly ReservationItem[],
    manager: EntityManager,
  ): Promise<ReservationItem[]>;
  findActiveAssignmentsByRoomIds(
    roomIds: readonly string[],
    manager: EntityManager,
  ): Promise<RoomAssignment[]>;
  findAndLockActiveAssignmentsByReservationId(
    reservationId: string,
    manager: EntityManager,
  ): Promise<RoomAssignment[]>;
  saveRoomAssignments(
    assignments: readonly RoomAssignment[],
    manager: EntityManager,
  ): Promise<RoomAssignment[]>;
}
