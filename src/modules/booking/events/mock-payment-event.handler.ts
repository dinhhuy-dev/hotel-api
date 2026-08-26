import { Injectable, OnModuleInit } from '@nestjs/common';
import { BookingEventBus } from './booking-event-bus';

@Injectable()
export class MockPaymentEventHandler implements OnModuleInit {
  constructor(private readonly eventBus: BookingEventBus) {}

  onModuleInit(): void {
    this.eventBus.subscribe('PaymentRequested', (event) => {
      this.eventBus.publish({
        type: 'PaymentSucceeded',
        reservationId: event.reservationId,
        requestId: event.requestId,
        amount: event.amount,
        reference: `mock-charge-${event.requestId}`,
      });
    });

    this.eventBus.subscribe('RefundRequested', (event) => {
      this.eventBus.publish({
        type: 'RefundSucceeded',
        reservationId: event.reservationId,
        requestId: event.requestId,
        amount: event.amount,
        reference: `mock-refund-${event.requestId}`,
      });
    });
  }
}
