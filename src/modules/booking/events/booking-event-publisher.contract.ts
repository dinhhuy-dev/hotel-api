import { BookingEvent } from './booking-event';

export const BOOKING_EVENT_PUBLISHER = Symbol('BOOKING_EVENT_PUBLISHER');

export interface BookingEventPublisher {
  publish(event: BookingEvent): void;
}
