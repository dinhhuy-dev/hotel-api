import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  PRICING_QUOTE_SERVICE,
  type PricingQuoteContract,
} from '../../pricing/contracts/pricing-quote.contract';
import {
  BOOKING_ROOM_CATALOG_SERVICE,
  type BookingAvailabilityRoomType,
  type BookingRoomCatalogService,
} from '../../room-catalog/contracts/booking-room-catalog.contract';
import { DataSource, type EntityManager } from 'typeorm';
import { BOOKING_CLOCK, type BookingClock } from '../contracts/booking-clock.contract';
import type {
  CustomerCreateReservationDto,
  ReceptionistCreateReservationDto,
} from '../dto/create-reservation.dto';
import type { ReservationResponseDto } from '../dto/reservation-response.dto';
import { CancellationReason } from '../entities/enum/cancellation-reason';
import { PaymentStatus } from '../entities/enum/payment-status';
import { ReservationStatus } from '../entities/enum/reservation-status';
import { ReservationItem } from '../entities/reservation-item.entity';
import { Reservation } from '../entities/reservation.entity';
import type { PaymentRequestedEvent, RefundRequestedEvent } from '../events/booking-event';
import {
  BOOKING_EVENT_PUBLISHER,
  type BookingEventPublisher,
} from '../events/booking-event-publisher.contract';
import type { BookingRepositoryPort } from '../repositories/ports/booking-repository.port';
import { BOOKING_REPOSITORY } from '../repositories/ports/booking-repository.token';
import { toReservationResponse } from './reservation-response.mapper';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MAXIMUM_STAY_NIGHTS = 30;
const MAXIMUM_ROOM_QUANTITY = 5;
const PENDING_HOLD_MILLISECONDS = 15 * 60 * 1000;
const POSTGRES_INTEGER_MAX = 2_147_483_647;
const IDEMPOTENCY_CONSTRAINT = 'uq_reservations_idempotency_key';

type CreationDto = CustomerCreateReservationDto | ReceptionistCreateReservationDto;

interface CreationContext {
  readonly customerId: string;
  readonly customerScoped: boolean;
  readonly idempotencyKey: string;
  readonly dto: CreationDto;
}

interface PaymentRequestSuccess {
  readonly kind: 'success';
  readonly response: ReservationResponseDto;
  readonly event: PaymentRequestedEvent;
}

interface ExpiredPaymentRequest {
  readonly kind: 'expired';
}

type PaymentRequestOutcome = PaymentRequestSuccess | ExpiredPaymentRequest;

interface CancellationOutcome {
  readonly response: ReservationResponseDto;
  readonly event?: RefundRequestedEvent;
}

@Injectable()
export class ReservationCommandService {
  constructor(
    @Inject(BOOKING_ROOM_CATALOG_SERVICE)
    private readonly roomCatalogService: Pick<
      BookingRoomCatalogService,
      'findAvailabilityRoomTypes'
    >,
    @Inject(BOOKING_REPOSITORY)
    private readonly repository: Pick<
      BookingRepositoryPort,
      | 'findByIdempotencyKey'
      | 'findWithDetailsById'
      | 'findAndLockById'
      | 'findCommittedQuantities'
      | 'saveReservation'
      | 'saveReservationItems'
    >,
    @Inject(PRICING_QUOTE_SERVICE)
    private readonly pricingQuoteService: Pick<PricingQuoteContract, 'quote'>,
    @Inject(BOOKING_CLOCK) private readonly clock: BookingClock,
    @Inject(BOOKING_EVENT_PUBLISHER)
    private readonly eventPublisher: BookingEventPublisher,
    private readonly dataSource: DataSource,
  ) {}

  createForCustomer(
    accountId: string,
    idempotencyKey: string,
    dto: CustomerCreateReservationDto,
  ): Promise<ReservationResponseDto> {
    return this.create({ customerId: accountId, customerScoped: true, idempotencyKey, dto });
  }

  createForReceptionist(
    idempotencyKey: string,
    dto: ReceptionistCreateReservationDto,
  ): Promise<ReservationResponseDto> {
    return this.create({
      customerId: dto.customerId,
      customerScoped: false,
      idempotencyKey,
      dto,
    });
  }

  requestPaymentForCustomer(customerId: string, id: string): Promise<ReservationResponseDto> {
    return this.requestPayment(id, customerId);
  }

  requestPaymentForReceptionist(id: string): Promise<ReservationResponseDto> {
    return this.requestPayment(id);
  }

  cancelForCustomer(customerId: string, id: string): Promise<ReservationResponseDto> {
    return this.cancel(id, CancellationReason.CustomerRequest, customerId);
  }

  cancelForReceptionist(id: string): Promise<ReservationResponseDto> {
    return this.cancel(id, CancellationReason.StaffRequest);
  }

  async markNoShow(id: string): Promise<ReservationResponseDto> {
    const response = await this.dataSource.transaction<ReservationResponseDto | null>(
      async (manager) => {
        const reservation = await this.findLockedReservation(id, manager);

        if (this.isExpiredPending(reservation, this.clock.now())) {
          reservation.status = ReservationStatus.Cancelled;
          reservation.cancellationReason = CancellationReason.PaymentTimeout;
          await this.repository.saveReservation(reservation, manager);

          return null;
        }

        if (reservation.status !== ReservationStatus.Confirmed) {
          throw this.invalidStateException();
        }

        const today = this.clock.today();

        if (today < reservation.checkInDate || today >= reservation.checkOutDate) {
          throw this.invalidStateException();
        }

        reservation.status = ReservationStatus.Cancelled;
        reservation.cancellationReason = CancellationReason.NoShow;
        await this.repository.saveReservation(reservation, manager);

        return this.toCurrentResponse(reservation, manager);
      },
    );

    if (response === null) {
      throw this.invalidStateException();
    }

    return response;
  }

  private async create(context: CreationContext): Promise<ReservationResponseDto> {
    try {
      return await this.dataSource.transaction((manager) =>
        this.createInTransaction(context, manager),
      );
    } catch (error: unknown) {
      if (!this.isIdempotencyUniqueViolation(error)) {
        throw error;
      }

      return this.resolveConcurrentReplay(context, error);
    }
  }

  private async requestPayment(id: string, customerId?: string): Promise<ReservationResponseDto> {
    const outcome = await this.dataSource.transaction<PaymentRequestOutcome>(async (manager) => {
      const reservation = await this.findLockedReservation(id, manager, customerId);

      if (this.isExpiredPending(reservation, this.clock.now())) {
        reservation.status = ReservationStatus.Cancelled;
        reservation.cancellationReason = CancellationReason.PaymentTimeout;
        await this.repository.saveReservation(reservation, manager);

        return { kind: 'expired' };
      }

      if (reservation.status !== ReservationStatus.Pending) {
        throw this.invalidStateException();
      }

      if (reservation.chargeRequestId === null) {
        reservation.chargeRequestId = randomUUID();
        await this.repository.saveReservation(reservation, manager);
      }

      const response = await this.toCurrentResponse(reservation, manager);

      return {
        kind: 'success',
        response,
        event: {
          type: 'PaymentRequested',
          reservationId: reservation.id,
          requestId: reservation.chargeRequestId,
          amount: reservation.totalAmount,
        },
      };
    });

    if (outcome.kind === 'expired') {
      throw new ConflictException({
        message: 'The pending Reservation has expired.',
        error: 'RESERVATION_EXPIRED',
      });
    }

    this.eventPublisher.publish(outcome.event);

    return outcome.response;
  }

  private async cancel(
    id: string,
    reason: CancellationReason,
    customerId?: string,
  ): Promise<ReservationResponseDto> {
    const outcome = await this.dataSource.transaction<CancellationOutcome>(async (manager) => {
      const reservation = await this.findLockedReservation(id, manager, customerId);
      let changed = false;
      let shouldCreateRefund = false;

      if (this.isExpiredPending(reservation, this.clock.now())) {
        reservation.status = ReservationStatus.Cancelled;
        reservation.cancellationReason = CancellationReason.PaymentTimeout;
        changed = true;
      } else if (reservation.status === ReservationStatus.Cancelled) {
        // Repeated cancellation is an idempotent success.
      } else if (
        reservation.status === ReservationStatus.Pending ||
        reservation.status === ReservationStatus.Confirmed
      ) {
        reservation.status = ReservationStatus.Cancelled;
        reservation.cancellationReason = reason;
        changed = true;
        shouldCreateRefund = true;
      } else {
        throw this.invalidStateException();
      }

      if (
        shouldCreateRefund &&
        reservation.paymentStatus === PaymentStatus.Paid &&
        reservation.refundRequestId === null
      ) {
        reservation.refundRequestId = randomUUID();
        changed = true;
      }

      if (changed) {
        await this.repository.saveReservation(reservation, manager);
      }

      const response = await this.toCurrentResponse(reservation, manager);
      const event =
        reservation.refundRequestId !== null && reservation.refundReference === null
          ? {
              type: 'RefundRequested' as const,
              reservationId: reservation.id,
              requestId: reservation.refundRequestId,
              amount: reservation.totalAmount,
            }
          : undefined;

      return { response, event };
    });

    if (outcome.event !== undefined) {
      this.eventPublisher.publish(outcome.event);
    }

    return outcome.response;
  }

  private async createInTransaction(
    context: CreationContext,
    manager: EntityManager,
  ): Promise<ReservationResponseDto> {
    const existing = await this.repository.findByIdempotencyKey(context.idempotencyKey, manager);

    if (existing !== null) {
      return this.replay(existing, context, manager);
    }

    this.validateRequest(context.dto);

    const requestedItemsByRoomTypeId = new Map(
      context.dto.items.map((item) => [item.roomTypeId, item]),
    );
    const roomTypeIds = [...requestedItemsByRoomTypeId.keys()].sort((left, right) =>
      left.localeCompare(right),
    );
    const roomTypes = await this.roomCatalogService.findAvailabilityRoomTypes(
      { roomTypeIds, lockForUpdate: true },
      manager,
    );
    const concurrentReplay = await this.repository.findByIdempotencyKey(
      context.idempotencyKey,
      manager,
    );

    if (concurrentReplay !== null) {
      return this.replay(concurrentReplay, context, manager);
    }

    const now = this.clock.now();

    this.assertAllRoomTypesAvailable(roomTypes, roomTypeIds);
    this.assertGuestCapacity(roomTypes, requestedItemsByRoomTypeId, context.dto.guestCount);

    const commitments = await this.repository.findCommittedQuantities(
      roomTypeIds,
      context.dto.checkInDate,
      context.dto.checkOutDate,
      now,
      manager,
    );
    const committedByRoomTypeId = new Map(
      commitments.map((commitment) => [commitment.roomTypeId, commitment.quantity]),
    );

    for (const roomType of roomTypes) {
      const requestedQuantity = requestedItemsByRoomTypeId.get(roomType.id)?.quantity ?? 0;
      const availableQuantity =
        roomType.sellableRoomCount - (committedByRoomTypeId.get(roomType.id) ?? 0);

      if (availableQuantity < requestedQuantity) {
        throw new ConflictException({
          message: 'The requested Room Type quantity is no longer available.',
          error: 'ROOM_AVAILABILITY_CONFLICT',
        });
      }
    }

    const pricing = await this.pricingQuoteService.quote(
      {
        roomTypeIds,
        checkInDate: context.dto.checkInDate,
        checkOutDate: context.dto.checkOutDate,
      },
      manager,
    );
    const quoteByRoomTypeId = new Map(
      pricing.quotes.map((quote) => [quote.roomTypeId, quote.pricePerRoomStay]),
    );

    if (
      pricing.unquotedRoomTypeIds.length > 0 ||
      quoteByRoomTypeId.size !== roomTypeIds.length ||
      roomTypeIds.some((roomTypeId) => !quoteByRoomTypeId.has(roomTypeId)) ||
      [...quoteByRoomTypeId.values()].some(
        (pricePerRoomStay) => pricePerRoomStay <= 0 || !Number.isSafeInteger(pricePerRoomStay),
      )
    ) {
      throw new ConflictException({
        message: 'Complete Pricing is unavailable for the requested stay.',
        error: 'PRICING_UNAVAILABLE',
      });
    }

    const itemSnapshots = roomTypeIds.map((roomTypeId) => {
      const requestedItem = requestedItemsByRoomTypeId.get(roomTypeId)!;
      const pricePerRoomStay = quoteByRoomTypeId.get(roomTypeId)!;

      return {
        roomTypeId,
        quantity: requestedItem.quantity,
        totalPrice: requestedItem.quantity * pricePerRoomStay,
      };
    });
    const totalAmount = itemSnapshots.reduce((total, item) => total + item.totalPrice, 0);

    if (
      itemSnapshots.some(
        (item) =>
          item.totalPrice <= 0 ||
          item.totalPrice > POSTGRES_INTEGER_MAX ||
          !Number.isSafeInteger(item.totalPrice),
      ) ||
      totalAmount <= 0 ||
      totalAmount > POSTGRES_INTEGER_MAX ||
      !Number.isSafeInteger(totalAmount)
    ) {
      throw new ConflictException({
        message: 'Complete Pricing is unavailable for the requested stay.',
        error: 'PRICING_UNAVAILABLE',
      });
    }

    const reservation = Object.assign(new Reservation(), {
      customerId: context.customerId,
      contactName: context.dto.contactName,
      contactPhone: context.dto.contactPhone,
      checkInDate: context.dto.checkInDate,
      checkOutDate: context.dto.checkOutDate,
      guestCount: context.dto.guestCount,
      status: ReservationStatus.Pending,
      totalAmount,
      expiresAt: new Date(now.getTime() + PENDING_HOLD_MILLISECONDS),
      paymentStatus: PaymentStatus.Unpaid,
      chargeRequestId: null,
      chargeReference: null,
      refundRequestId: null,
      refundReference: null,
      idempotencyKey: context.idempotencyKey,
      cancellationReason: null,
      checkedInAt: null,
      checkedOutAt: null,
    });
    const savedReservation = await this.repository.saveReservation(reservation, manager);
    const savedItems = await this.repository.saveReservationItems(
      itemSnapshots.map((snapshot) =>
        Object.assign(new ReservationItem(), snapshot, {
          reservationId: savedReservation.id,
          reservation: savedReservation,
          assignments: [],
        }),
      ),
      manager,
    );

    savedReservation.items = savedItems.map((item) => {
      item.assignments ??= [];
      return item;
    });

    return toReservationResponse(savedReservation);
  }

  private async replay(
    existing: Reservation,
    context: CreationContext,
    manager: EntityManager,
  ): Promise<ReservationResponseDto> {
    this.assertReplayAccess(existing, context);

    if (!this.isExpiredPending(existing, this.clock.now())) {
      return toReservationResponse(existing);
    }

    const locked = await this.repository.findAndLockById(existing.id, manager);

    if (locked !== null && this.isExpiredPending(locked, this.clock.now())) {
      locked.status = ReservationStatus.Cancelled;
      locked.cancellationReason = CancellationReason.PaymentTimeout;
      await this.repository.saveReservation(locked, manager);
    }

    const latest = await this.repository.findWithDetailsById(existing.id, manager);

    return toReservationResponse(latest ?? existing);
  }

  private async resolveConcurrentReplay(
    context: CreationContext,
    originalError: unknown,
  ): Promise<ReservationResponseDto> {
    const existing = await this.repository.findByIdempotencyKey(
      context.idempotencyKey,
      this.dataSource.manager,
    );

    if (existing === null) {
      throw originalError;
    }

    this.assertReplayAccess(existing, context);

    if (!this.isExpiredPending(existing, this.clock.now())) {
      return toReservationResponse(existing);
    }

    return this.dataSource.transaction(async (manager) => {
      const latest = await this.repository.findByIdempotencyKey(context.idempotencyKey, manager);

      if (latest === null) {
        throw originalError;
      }

      return this.replay(latest, context, manager);
    });
  }

  private validateRequest(dto: CreationDto): void {
    const distinctRoomTypeIds = new Set(dto.items.map((item) => item.roomTypeId));
    const totalQuantity = dto.items.reduce((total, item) => total + item.quantity, 0);

    if (
      distinctRoomTypeIds.size !== dto.items.length ||
      totalQuantity < 1 ||
      totalQuantity > MAXIMUM_ROOM_QUANTITY
    ) {
      throw new BadRequestException({
        message: 'Reservation items are invalid.',
        error: 'INVALID_RESERVATION_REQUEST',
      });
    }

    const nightCount = this.countNights(dto.checkInDate, dto.checkOutDate);

    if (
      dto.checkInDate < this.clock.today() ||
      dto.checkOutDate <= dto.checkInDate ||
      nightCount > MAXIMUM_STAY_NIGHTS
    ) {
      throw new BadRequestException({
        message: 'Reservation stay range is invalid.',
        error: 'INVALID_RESERVATION_RANGE',
      });
    }
  }

  private assertAllRoomTypesAvailable(
    roomTypes: readonly BookingAvailabilityRoomType[],
    roomTypeIds: readonly string[],
  ): void {
    const returnedRoomTypeIds = new Set(roomTypes.map((roomType) => roomType.id));

    if (
      returnedRoomTypeIds.size !== roomTypeIds.length ||
      roomTypeIds.some((roomTypeId) => !returnedRoomTypeIds.has(roomTypeId))
    ) {
      throw new ConflictException({
        message: 'One or more requested Room Types are unavailable.',
        error: 'ROOM_TYPE_UNAVAILABLE',
      });
    }
  }

  private assertGuestCapacity(
    roomTypes: readonly BookingAvailabilityRoomType[],
    itemsByRoomTypeId: ReadonlyMap<string, { readonly quantity: number }>,
    guestCount: number,
  ): void {
    const totalCapacity = roomTypes.reduce(
      (capacity, roomType) =>
        capacity + roomType.maxOccupancy * (itemsByRoomTypeId.get(roomType.id)?.quantity ?? 0),
      0,
    );

    if (totalCapacity < guestCount) {
      throw new BadRequestException({
        message: 'The selected rooms do not have enough guest capacity.',
        error: 'INVALID_RESERVATION_REQUEST',
      });
    }
  }

  private assertReplayAccess(existing: Reservation, context: CreationContext): void {
    if (context.customerScoped && existing.customerId !== context.customerId) {
      throw new ConflictException({
        message: 'The idempotency key has already been used.',
        error: 'IDEMPOTENCY_KEY_REUSED',
      });
    }
  }

  private async findLockedReservation(
    id: string,
    manager: EntityManager,
    customerId?: string,
  ): Promise<Reservation> {
    const reservation = await this.repository.findAndLockById(id, manager);

    if (
      reservation === null ||
      (customerId !== undefined && reservation.customerId !== customerId)
    ) {
      throw new NotFoundException({
        message: 'Reservation not found.',
        error: 'RESERVATION_NOT_FOUND',
      });
    }

    return reservation;
  }

  private async toCurrentResponse(
    reservation: Reservation,
    manager: EntityManager,
  ): Promise<ReservationResponseDto> {
    const current = await this.repository.findWithDetailsById(reservation.id, manager);

    if (current === null) {
      return toReservationResponse(reservation);
    }

    return toReservationResponse(current);
  }

  private invalidStateException(): ConflictException {
    return new ConflictException({
      message: 'The Reservation state does not allow this action.',
      error: 'INVALID_RESERVATION_STATE',
    });
  }

  private isExpiredPending(reservation: Reservation, now: Date): boolean {
    return reservation.status === ReservationStatus.Pending && reservation.expiresAt <= now;
  }

  private countNights(startDate: string, endDate: string): number {
    return (
      (Date.parse(`${endDate}T00:00:00.000Z`) - Date.parse(`${startDate}T00:00:00.000Z`)) /
      MILLISECONDS_PER_DAY
    );
  }

  private isIdempotencyUniqueViolation(error: unknown): boolean {
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
      candidate.constraint === IDEMPOTENCY_CONSTRAINT
    );
  }
}
