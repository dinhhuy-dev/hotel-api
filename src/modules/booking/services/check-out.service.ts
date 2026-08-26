import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BOOKING_ROOM_CATALOG_SERVICE,
  type BookingRoomCatalogService,
} from '../../room-catalog/contracts/booking-room-catalog.contract';
import { DataSource, type EntityManager } from 'typeorm';
import { BOOKING_CLOCK, type BookingClock } from '../contracts/booking-clock.contract';
import type { ReservationResponseDto } from '../dto/reservation-response.dto';
import { ReservationStatus } from '../entities/enum/reservation-status';
import type { RoomsCheckedOutEvent } from '../events/booking-event';
import {
  BOOKING_EVENT_PUBLISHER,
  type BookingEventPublisher,
} from '../events/booking-event-publisher.contract';
import type { BookingRepositoryPort } from '../repositories/ports/booking-repository.port';
import { BOOKING_REPOSITORY } from '../repositories/ports/booking-repository.token';
import { toReservationResponse } from './reservation-response.mapper';

interface CheckOutResult {
  readonly response: ReservationResponseDto;
  readonly event: RoomsCheckedOutEvent;
}

@Injectable()
export class CheckOutService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly repository: Pick<
      BookingRepositoryPort,
      | 'findAndLockById'
      | 'findAndLockActiveAssignmentsByReservationId'
      | 'saveRoomAssignments'
      | 'saveReservation'
      | 'findWithDetailsById'
    >,
    @Inject(BOOKING_ROOM_CATALOG_SERVICE)
    private readonly roomCatalogService: Pick<
      BookingRoomCatalogService,
      'findRoomsForAssignment' | 'markRoomsDirty'
    >,
    @Inject(BOOKING_CLOCK) private readonly clock: BookingClock,
    @Inject(BOOKING_EVENT_PUBLISHER)
    private readonly eventPublisher: BookingEventPublisher,
    private readonly dataSource: DataSource,
  ) {}

  async checkOut(reservationId: string): Promise<ReservationResponseDto> {
    const result = await this.dataSource.transaction((manager) =>
      this.checkOutInTransaction(reservationId, manager),
    );

    this.eventPublisher.publish(result.event);

    return result.response;
  }

  private async checkOutInTransaction(
    reservationId: string,
    manager: EntityManager,
  ): Promise<CheckOutResult> {
    const reservation = await this.repository.findAndLockById(reservationId, manager);

    if (reservation === null) {
      throw new NotFoundException({
        message: 'Reservation not found.',
        error: 'RESERVATION_NOT_FOUND',
      });
    }

    if (reservation.status !== ReservationStatus.CheckedIn) {
      throw new ConflictException({
        message: 'The Reservation state does not allow this action.',
        error: 'INVALID_RESERVATION_STATE',
      });
    }

    const assignments = await this.repository.findAndLockActiveAssignmentsByReservationId(
      reservation.id,
      manager,
    );
    const roomIds = assignments
      .map((assignment) => assignment.roomId)
      .sort((left, right) => left.localeCompare(right));

    if (roomIds.length === 0 || new Set(roomIds).size !== roomIds.length) {
      throw this.assignmentUnavailableException();
    }

    const rooms = await this.roomCatalogService.findRoomsForAssignment(
      { roomIds, lockForUpdate: true },
      manager,
    );
    const returnedRoomIds = new Set(rooms.map((room) => room.id));

    if (
      rooms.length !== roomIds.length ||
      returnedRoomIds.size !== roomIds.length ||
      roomIds.some((roomId) => !returnedRoomIds.has(roomId))
    ) {
      throw this.assignmentUnavailableException();
    }

    const checkedOutAt = this.clock.now();
    await this.roomCatalogService.markRoomsDirty(roomIds, manager);

    for (const assignment of assignments) {
      assignment.releasedAt = checkedOutAt;
    }

    await this.repository.saveRoomAssignments(assignments, manager);
    reservation.status = ReservationStatus.CheckedOut;
    reservation.checkedOutAt = checkedOutAt;
    const savedReservation = await this.repository.saveReservation(reservation, manager);
    const latestReservation = await this.repository.findWithDetailsById(
      savedReservation.id,
      manager,
    );
    const roomNumberByRoomId = new Map(rooms.map((room) => [room.id, room.roomNumber]));

    return {
      response: toReservationResponse(latestReservation ?? savedReservation, roomNumberByRoomId),
      event: {
        type: 'RoomsCheckedOut',
        reservationId: savedReservation.id,
        roomIds,
        checkedOutAt: checkedOutAt.toISOString(),
      },
    };
  }

  private assignmentUnavailableException(): ConflictException {
    return new ConflictException({
      message: 'The assigned Rooms are unavailable for check-out.',
      error: 'ROOM_ASSIGNMENT_UNAVAILABLE',
    });
  }
}
