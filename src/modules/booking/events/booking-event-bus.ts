import { Injectable, Logger } from '@nestjs/common';
import { BookingEvent, BookingEventFor, BookingEventType } from './booking-event';
import { BookingEventPublisher } from './booking-event-publisher.contract';

export type BookingEventHandler<TType extends BookingEventType> = (
  event: BookingEventFor<TType>,
) => Promise<void> | void;

type StoredBookingEventHandler = (event: BookingEvent) => Promise<void> | void;

@Injectable()
export class BookingEventBus implements BookingEventPublisher {
  private readonly logger = new Logger(BookingEventBus.name);
  private readonly handlers = new Map<BookingEventType, StoredBookingEventHandler[]>();

  subscribe<TType extends BookingEventType>(
    type: TType,
    handler: BookingEventHandler<TType>,
  ): void {
    const handlers = this.handlers.get(type) ?? [];
    handlers.push((event) => handler(event as BookingEventFor<TType>));
    this.handlers.set(type, handlers);
  }

  publish(event: BookingEvent): void {
    queueMicrotask(() => {
      for (const handler of this.handlers.get(event.type) ?? []) {
        Promise.resolve()
          .then(() => handler(event))
          .catch((error: unknown) => {
            const message = error instanceof Error ? error.message : 'Unknown event handler error';
            this.logger.error(`Booking event ${event.type} failed: ${message}`);
          });
      }
    });
  }
}
