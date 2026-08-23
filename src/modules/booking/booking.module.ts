import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingModule } from '../pricing/pricing.module';
import { RoomCatalogModule } from '../room-catalog/room-catalog.module';
import { BOOKING_CLOCK, SystemBookingClock } from './contracts/booking-clock.contract';
import { ReservationItem } from './entities/reservation-item.entity';
import { Reservation } from './entities/reservation.entity';
import { RoomAssignment } from './entities/room-assignment.entity';
import { BookingEventBus } from './events/booking-event-bus';
import { BOOKING_EVENT_PUBLISHER } from './events/booking-event-publisher.contract';
import { MockPaymentEventHandler } from './events/mock-payment-event.handler';
import { NoopHousekeepingEventHandler } from './events/noop-housekeeping-event.handler';
import { BOOKING_REPOSITORY } from './repositories/ports/booking-repository.token';
import { TypeOrmBookingRepository } from './repositories/typeorm/typeorm-booking.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, ReservationItem, RoomAssignment]),
    RoomCatalogModule,
    PricingModule,
  ],
  providers: [
    TypeOrmBookingRepository,
    SystemBookingClock,
    BookingEventBus,
    MockPaymentEventHandler,
    NoopHousekeepingEventHandler,
    {
      provide: BOOKING_REPOSITORY,
      useExisting: TypeOrmBookingRepository,
    },
    {
      provide: BOOKING_CLOCK,
      useExisting: SystemBookingClock,
    },
    {
      provide: BOOKING_EVENT_PUBLISHER,
      useExisting: BookingEventBus,
    },
  ],
})
export class BookingModule {}
