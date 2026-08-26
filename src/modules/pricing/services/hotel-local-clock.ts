import { Injectable } from '@nestjs/common';

export const HOTEL_LOCAL_CLOCK = Symbol('HOTEL_LOCAL_CLOCK');

export interface HotelLocalClock {
  currentDate(): string;
}

@Injectable()
export class SystemHotelLocalClock implements HotelLocalClock {
  currentDate(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const values = new Map(parts.map((part) => [part.type, part.value]));

    return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
  }
}
