import { Injectable } from '@nestjs/common';

export const BOOKING_CLOCK = Symbol('BOOKING_CLOCK');

export interface BookingClock {
  now(): Date;
  today(): string;
}

@Injectable()
export class SystemBookingClock implements BookingClock {
  now(): Date {
    return new Date();
  }

  today(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(this.now());

    const values = new Map(parts.map((part) => [part.type, part.value]));

    return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
  }
}
