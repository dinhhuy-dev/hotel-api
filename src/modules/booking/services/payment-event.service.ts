import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager } from 'typeorm';
import { BOOKING_CLOCK, type BookingClock } from '../contracts/booking-clock.contract';
import { CancellationReason } from '../entities/enum/cancellation-reason';
import { PaymentStatus } from '../entities/enum/payment-status';
import { ReservationStatus } from '../entities/enum/reservation-status';
import { BookingEventBus } from '../events/booking-event-bus';
import {
  type PaymentSucceededEvent,
  type RefundRequestedEvent,
  type RefundSucceededEvent,
} from '../events/booking-event';
import {
  BOOKING_EVENT_PUBLISHER,
  type BookingEventPublisher,
} from '../events/booking-event-publisher.contract';
import type { BookingRepositoryPort } from '../repositories/ports/booking-repository.port';
import { BOOKING_REPOSITORY } from '../repositories/ports/booking-repository.token';

@Injectable()
export class PaymentEventService implements OnModuleInit {
  constructor(
    private readonly eventBus: BookingEventBus,
    @Inject(BOOKING_REPOSITORY)
    private readonly repository: Pick<BookingRepositoryPort, 'findAndLockById' | 'saveReservation'>,
    @Inject(BOOKING_CLOCK) private readonly clock: BookingClock,
    @Inject(BOOKING_EVENT_PUBLISHER)
    private readonly eventPublisher: BookingEventPublisher,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe('PaymentSucceeded', (event) => this.handlePaymentSucceeded(event));
    this.eventBus.subscribe('RefundSucceeded', (event) => this.handleRefundSucceeded(event));
  }

  private async handlePaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
    const refundRequested = await this.dataSource.transaction((manager) =>
      this.applyPaymentSuccess(event, manager),
    );

    if (refundRequested !== null) {
      this.eventPublisher.publish(refundRequested);
    }
  }

  private async applyPaymentSuccess(
    event: PaymentSucceededEvent,
    manager: EntityManager,
  ): Promise<RefundRequestedEvent | null> {
    const reservation = await this.repository.findAndLockById(event.reservationId, manager);

    if (
      reservation === null ||
      reservation.chargeRequestId !== event.requestId ||
      reservation.totalAmount !== event.amount ||
      reservation.chargeReference !== null
    ) {
      return null;
    }

    if (
      reservation.status === ReservationStatus.Pending &&
      reservation.expiresAt.getTime() > this.clock.now().getTime()
    ) {
      reservation.chargeReference = event.reference;
      reservation.status = ReservationStatus.Confirmed;
      reservation.paymentStatus = PaymentStatus.Paid;
      await this.repository.saveReservation(reservation, manager);

      return null;
    }

    if (
      reservation.status !== ReservationStatus.Pending &&
      reservation.status !== ReservationStatus.Cancelled
    ) {
      return null;
    }

    reservation.chargeReference = event.reference;
    reservation.paymentStatus = PaymentStatus.Paid;

    if (reservation.status === ReservationStatus.Pending) {
      reservation.status = ReservationStatus.Cancelled;
      reservation.cancellationReason = CancellationReason.PaymentTimeout;
    }

    reservation.refundRequestId ??= randomUUID();
    await this.repository.saveReservation(reservation, manager);

    return {
      type: 'RefundRequested',
      reservationId: reservation.id,
      requestId: reservation.refundRequestId,
      amount: reservation.totalAmount,
    };
  }

  private async handleRefundSucceeded(event: RefundSucceededEvent): Promise<void> {
    await this.dataSource.transaction((manager) => this.applyRefundSuccess(event, manager));
  }

  private async applyRefundSuccess(
    event: RefundSucceededEvent,
    manager: EntityManager,
  ): Promise<void> {
    const reservation = await this.repository.findAndLockById(event.reservationId, manager);

    if (
      reservation === null ||
      reservation.refundRequestId !== event.requestId ||
      reservation.totalAmount !== event.amount ||
      reservation.refundReference !== null
    ) {
      return;
    }

    reservation.refundReference = event.reference;
    reservation.paymentStatus = PaymentStatus.Refunded;
    await this.repository.saveReservation(reservation, manager);
  }
}
