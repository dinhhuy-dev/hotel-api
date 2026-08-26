export interface PaymentRequestedEvent {
  type: 'PaymentRequested';
  reservationId: string;
  requestId: string;
  amount: number;
}

export interface PaymentSucceededEvent {
  type: 'PaymentSucceeded';
  reservationId: string;
  requestId: string;
  amount: number;
  reference: string;
}

export interface RefundRequestedEvent {
  type: 'RefundRequested';
  reservationId: string;
  requestId: string;
  amount: number;
}

export interface RefundSucceededEvent {
  type: 'RefundSucceeded';
  reservationId: string;
  requestId: string;
  amount: number;
  reference: string;
}

export interface RoomsCheckedOutEvent {
  type: 'RoomsCheckedOut';
  reservationId: string;
  roomIds: string[];
  checkedOutAt: string;
}

export type BookingEvent =
  | PaymentRequestedEvent
  | PaymentSucceededEvent
  | RefundRequestedEvent
  | RefundSucceededEvent
  | RoomsCheckedOutEvent;

export type BookingEventType = BookingEvent['type'];

export type BookingEventFor<TType extends BookingEventType> = Extract<
  BookingEvent,
  { type: TType }
>;
