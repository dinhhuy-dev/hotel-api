import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import {
  BOOKING_ROOM_CATALOG_SERVICE,
  type BookingRoomCatalogService,
} from '../../room-catalog/contracts/booking-room-catalog.contract';
import { DataSource, type EntityManager } from 'typeorm';
import { BOOKING_CLOCK, type BookingClock } from '../contracts/booking-clock.contract';
import {
  CustomerReservationQueryDto,
  StaffReservationQueryDto,
} from '../dto/reservation-query.dto';
import { ReservationResponseDto } from '../dto/reservation-response.dto';
import { CancellationReason } from '../entities/enum/cancellation-reason';
import { ReservationStatus } from '../entities/enum/reservation-status';
import type { Reservation } from '../entities/reservation.entity';
import type {
  BookingRepositoryPort,
  ReservationListResult,
} from '../repositories/ports/booking-repository.port';
import { BOOKING_REPOSITORY } from '../repositories/ports/booking-repository.token';
import { toReservationResponse } from './reservation-response.mapper';

@Injectable()
export class ReservationQueryService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly repository: Pick<
      BookingRepositoryPort,
      | 'findPage'
      | 'findExpiredPendingIds'
      | 'findWithDetailsById'
      | 'findAndLockById'
      | 'saveReservation'
    >,
    @Inject(BOOKING_ROOM_CATALOG_SERVICE)
    private readonly roomCatalogService: Pick<BookingRoomCatalogService, 'findRoomsForAssignment'>,
    @Inject(BOOKING_CLOCK) private readonly clock: BookingClock,
    private readonly dataSource: DataSource,
  ) {}

  listForCustomer(
    customerId: string,
    dto: CustomerReservationQueryDto,
  ): Promise<PaginatedResult<ReservationResponseDto>> {
    return this.dataSource.transaction(async (manager) => {
      const now = this.clock.now();
      await this.materializeExpiredScope({ customerId }, now, manager);
      const result = await this.repository.findPage(
        {
          page: dto.page,
          limit: dto.limit,
          customerId,
          status: dto.status,
        },
        manager,
      );

      return this.toPaginatedResponse(result, dto, manager);
    });
  }

  findOneForCustomer(customerId: string, id: string): Promise<ReservationResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await this.repository.findWithDetailsById(id, manager);

      if (reservation === null || reservation.customerId !== customerId) {
        throw this.notFoundException();
      }

      return this.toResponse(reservation, this.clock.now(), manager);
    });
  }

  listForStaff(dto: StaffReservationQueryDto): Promise<PaginatedResult<ReservationResponseDto>> {
    return this.dataSource.transaction(async (manager) => {
      const now = this.clock.now();
      await this.materializeExpiredScope(
        {
          customerId: dto.customerId,
          checkInDate: dto.checkInDate,
          checkOutDate: dto.checkOutDate,
        },
        now,
        manager,
      );
      const result = await this.repository.findPage(
        {
          page: dto.page,
          limit: dto.limit,
          customerId: dto.customerId,
          status: dto.status,
          checkInDate: dto.checkInDate,
          checkOutDate: dto.checkOutDate,
        },
        manager,
      );

      return this.toPaginatedResponse(result, dto, manager);
    });
  }

  findOneForStaff(id: string): Promise<ReservationResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await this.repository.findWithDetailsById(id, manager);

      if (reservation === null) {
        throw this.notFoundException();
      }

      return this.toResponse(reservation, this.clock.now(), manager);
    });
  }

  private async toPaginatedResponse(
    result: ReservationListResult,
    pagination: { readonly page: number; readonly limit: number },
    manager: EntityManager,
  ): Promise<PaginatedResult<ReservationResponseDto>> {
    const roomNumberByRoomId = await this.findRoomNumbers(result.items, manager);

    return new PaginatedResult(
      result.items.map((reservation) => toReservationResponse(reservation, roomNumberByRoomId)),
      {
        page: pagination.page,
        pageSize: pagination.limit,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / pagination.limit),
      },
    );
  }

  private async materializeExpiredScope(
    options: {
      readonly customerId?: string;
      readonly checkInDate?: string;
      readonly checkOutDate?: string;
    },
    now: Date,
    manager: EntityManager,
  ): Promise<void> {
    const reservationIds = await this.repository.findExpiredPendingIds(
      { ...options, now },
      manager,
    );

    for (const reservationId of reservationIds.sort((left, right) => left.localeCompare(right))) {
      const lockedReservation = await this.repository.findAndLockById(reservationId, manager);

      if (lockedReservation !== null && this.isExpiredPending(lockedReservation, now)) {
        lockedReservation.status = ReservationStatus.Cancelled;
        lockedReservation.cancellationReason = CancellationReason.PaymentTimeout;
        await this.repository.saveReservation(lockedReservation, manager);
      }
    }
  }

  private async toResponse(
    reservation: Reservation,
    now: Date,
    manager: EntityManager,
  ): Promise<ReservationResponseDto> {
    const [currentReservation] = await this.materializeExpirations([reservation], now, manager);
    const roomNumberByRoomId = await this.findRoomNumbers([currentReservation], manager);

    return toReservationResponse(currentReservation, roomNumberByRoomId);
  }

  private async materializeExpirations(
    reservations: readonly Reservation[],
    now: Date,
    manager: EntityManager,
  ): Promise<Reservation[]> {
    const expiredReservationIds = reservations
      .filter((reservation) => this.isExpiredPending(reservation, now))
      .map((reservation) => reservation.id)
      .sort((left, right) => left.localeCompare(right));
    const currentByReservationId = new Map<string, Reservation>();

    for (const reservationId of expiredReservationIds) {
      const lockedReservation = await this.repository.findAndLockById(reservationId, manager);

      if (lockedReservation === null) {
        continue;
      }

      if (this.isExpiredPending(lockedReservation, now)) {
        lockedReservation.status = ReservationStatus.Cancelled;
        lockedReservation.cancellationReason = CancellationReason.PaymentTimeout;
        currentByReservationId.set(
          reservationId,
          await this.repository.saveReservation(lockedReservation, manager),
        );
      } else {
        currentByReservationId.set(reservationId, lockedReservation);
      }
    }

    return reservations.map((reservation) => {
      const currentReservation = currentByReservationId.get(reservation.id);

      if (currentReservation !== undefined) {
        const items = reservation.items;
        Object.assign(reservation, currentReservation);
        reservation.items = items;
      }

      return reservation;
    });
  }

  private isExpiredPending(reservation: Reservation, now: Date): boolean {
    return (
      reservation.status === ReservationStatus.Pending &&
      reservation.expiresAt.getTime() <= now.getTime()
    );
  }

  private async findRoomNumbers(
    reservations: readonly Reservation[],
    manager: EntityManager,
  ): Promise<ReadonlyMap<string, string>> {
    const roomIds = [
      ...new Set(
        reservations.flatMap((reservation) =>
          (reservation.items ?? []).flatMap((item) =>
            (item.assignments ?? []).map((assignment) => assignment.roomId),
          ),
        ),
      ),
    ].sort((left, right) => left.localeCompare(right));

    if (roomIds.length === 0) {
      return new Map();
    }

    const rooms = await this.roomCatalogService.findRoomsForAssignment(
      { roomIds, lockForUpdate: false },
      manager,
    );

    return new Map(rooms.map((room) => [room.id, room.roomNumber]));
  }

  private notFoundException(): NotFoundException {
    return new NotFoundException({
      message: 'Reservation not found.',
      error: 'RESERVATION_NOT_FOUND',
    });
  }
}
