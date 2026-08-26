import { Injectable, OnModuleInit } from '@nestjs/common';
import { BookingEventBus } from './booking-event-bus';

@Injectable()
export class NoopHousekeepingEventHandler implements OnModuleInit {
  constructor(private readonly eventBus: BookingEventBus) {}

  onModuleInit(): void {
    this.eventBus.subscribe('RoomsCheckedOut', () => undefined);
  }
}
