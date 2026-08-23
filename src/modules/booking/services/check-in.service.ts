import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BOOKING_ROOM_CATALOG_SERVICE,
  type BookingAssignmentRoom,
  type BookingRoomCatalogService,
} from '../../room-catalog/contracts/booking-room-catalog.contract';
import { DataSource } from 'typeorm';
import { BOOKING_CLOCK, type BookingClock } from '../contracts/booking-clock.contract';
import type { ReservationResponseDto } from '../dto/reservation-response.dto';
import { PaymentStatus } from '../entities/enum/payment-status';
import { ReservationStatus } from '../entities/enum/reservation-status';
import type { ReservationItem } from '../entities/reservation-item.entity';
import type { Reservation } from '../entities/reservation.entity';
import { RoomAssignment } from '../entities/room-assignment.entity';
import type { BookingRepositoryPort } from '../repositories/ports/booking-repository.port';
import { BOOKING_REPOSITORY } from '../repositories/ports/booking-repository.token';
import { toReservationResponse } from './reservation-response.mapper';

const ACTIVE_ASSIGNMENT_CONSTRAINT = 'uq_room_assignments_active_room';

@Injectable()
export class CheckInService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly repository: Pick<
      BookingRepositoryPort,
      | 'findAndLockById'
      | 'findWithDetailsById'
      | 'findActiveAssignmentsByRoomIds'
      | 'saveRoomAssignments'
      | 'saveReservation'
    >,
    @Inject(BOOKING_ROOM_CATALOG_SERVICE)
    private readonly roomCatalogService: Pick<BookingRoomCatalogService, 'findRoomsForAssignment'>,
    @Inject(BOOKING_CLOCK) private readonly clock: BookingClock,
    private readonly dataSource: DataSource,
  ) {}

  async checkIn(
    reservationId: string,
    roomIds: readonly string[],
  ): Promise<ReservationResponseDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const reservation = await this.repository.findAndLockById(reservationId, manager);

        if (reservation === null) {
          throw new NotFoundException({
            message: 'Reservation not found.',
            error: 'RESERVATION_NOT_FOUND',
          });
        }

        this.validateLifecycle(reservation);

        const details = await this.repository.findWithDetailsById(reservationId, manager);
        const items = details?.items ?? [];
        const requiredRoomCount = items.reduce((total, item) => total + item.quantity, 0);

        if (
          requiredRoomCount < 1 ||
          roomIds.length !== requiredRoomCount ||
          new Set(roomIds).size !== roomIds.length
        ) {
          throw this.roomAssignmentUnavailableException();
        }

        const sortedRoomIds = [...roomIds].sort((left, right) => left.localeCompare(right));
        const returnedRooms = await this.roomCatalogService.findRoomsForAssignment(
          { roomIds: sortedRoomIds, lockForUpdate: true },
          manager,
        );
        const roomsById = new Map(returnedRooms.map((room) => [room.id, room]));

        if (
          returnedRooms.length !== sortedRoomIds.length ||
          roomsById.size !== sortedRoomIds.length ||
          sortedRoomIds.some((roomId) => !roomsById.has(roomId))
        ) {
          throw this.roomAssignmentUnavailableException();
        }

        const rooms = sortedRoomIds.map((roomId) => roomsById.get(roomId)!);

        if (rooms.some((room) => room.operationalStatus !== 'READY')) {
          throw this.roomAssignmentUnavailableException();
        }

        this.validateRoomTypeQuantities(items, rooms);

        const activeAssignments = await this.repository.findActiveAssignmentsByRoomIds(
          sortedRoomIds,
          manager,
        );

        if (activeAssignments.length > 0) {
          throw this.roomAssignmentUnavailableException();
        }

        const checkedInAt = this.clock.now();
        const itemByRoomTypeId = new Map(items.map((item) => [item.roomTypeId, item]));
        const assignments = rooms.map((room) => {
          const item = itemByRoomTypeId.get(room.roomTypeId)!;

          return Object.assign(new RoomAssignment(), {
            reservationItemId: item.id,
            reservationItem: item,
            roomId: room.id,
            assignedAt: checkedInAt,
            releasedAt: null,
          });
        });
        const savedAssignments = await this.repository.saveRoomAssignments(assignments, manager);

        for (const item of items) {
          item.assignments = savedAssignments.filter(
            (assignment) => assignment.reservationItemId === item.id,
          );
        }

        reservation.status = ReservationStatus.CheckedIn;
        reservation.checkedInAt = checkedInAt;
        reservation.items = items;
        const savedReservation = await this.repository.saveReservation(reservation, manager);
        savedReservation.items = items;

        return toReservationResponse(
          savedReservation,
          new Map(rooms.map((room) => [room.id, room.roomNumber])),
        );
      });
    } catch (error: unknown) {
      if (this.isActiveAssignmentUniqueViolation(error)) {
        throw this.roomAssignmentUnavailableException();
      }

      throw error;
    }
  }

  private validateLifecycle(reservation: Reservation): void {
    const today = this.clock.today();

    if (
      reservation.status !== ReservationStatus.Confirmed ||
      reservation.paymentStatus !== PaymentStatus.Paid ||
      today < reservation.checkInDate ||
      today >= reservation.checkOutDate
    ) {
      throw new ConflictException({
        message: 'The Reservation state does not allow check-in.',
        error: 'INVALID_RESERVATION_STATE',
      });
    }
  }

  private validateRoomTypeQuantities(
    items: readonly ReservationItem[],
    rooms: readonly BookingAssignmentRoom[],
  ): void {
    const requiredByRoomTypeId = new Map<string, number>();
    const suppliedByRoomTypeId = new Map<string, number>();

    for (const item of items) {
      requiredByRoomTypeId.set(
        item.roomTypeId,
        (requiredByRoomTypeId.get(item.roomTypeId) ?? 0) + item.quantity,
      );
    }

    for (const room of rooms) {
      suppliedByRoomTypeId.set(
        room.roomTypeId,
        (suppliedByRoomTypeId.get(room.roomTypeId) ?? 0) + 1,
      );
    }

    if (
      requiredByRoomTypeId.size !== suppliedByRoomTypeId.size ||
      [...requiredByRoomTypeId].some(
        ([roomTypeId, quantity]) => suppliedByRoomTypeId.get(roomTypeId) !== quantity,
      )
    ) {
      throw this.roomAssignmentUnavailableException();
    }
  }

  private roomAssignmentUnavailableException(): ConflictException {
    return new ConflictException({
      message: 'The requested Rooms cannot satisfy this Reservation.',
      error: 'ROOM_ASSIGNMENT_UNAVAILABLE',
    });
  }

  private isActiveAssignmentUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidate = 'driverError' in error ? error.driverError : error;

    return (
      typeof candidate === 'object' &&
      candidate !== null &&
      'code' in candidate &&
      candidate.code === '23505' &&
      'constraint' in candidate &&
      candidate.constraint === ACTIVE_ASSIGNMENT_CONSTRAINT
    );
  }
}
