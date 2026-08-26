import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingModule } from '../pricing/pricing.module';
import { RoomCatalogModule } from '../room-catalog/room-catalog.module';
import { BOOKING_CLOCK, SystemBookingClock } from './contracts/booking-clock.contract';
import { PublicAvailabilityController } from './controller/public-availability.controller';
import { CustomerReservationController } from './controller/customer-reservation.controller';
import { ReceptionistReservationController } from './controller/receptionist-reservation.controller';
import { StaffReservationController } from './controller/staff-reservation.controller';
import { ReservationItem } from './entities/reservation-item.entity';
import { Reservation } from './entities/reservation.entity';
import { RoomAssignment } from './entities/room-assignment.entity';
import { BookingEventBus } from './events/booking-event-bus';
import { BOOKING_EVENT_PUBLISHER } from './events/booking-event-publisher.contract';
import { MockPaymentEventHandler } from './events/mock-payment-event.handler';
import { NoopHousekeepingEventHandler } from './events/noop-housekeeping-event.handler';
import { BOOKING_REPOSITORY } from './repositories/ports/booking-repository.token';
import { TypeOrmBookingRepository } from './repositories/typeorm/typeorm-booking.repository';
import { AvailabilityService } from './services/availability.service';
import { CheckInService } from './services/check-in.service';
import { CheckOutService } from './services/check-out.service';
import { PaymentEventService } from './services/payment-event.service';
import { ReservationCommandService } from './services/reservation-command.service';
import { ReservationQueryService } from './services/reservation-query.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, ReservationItem, RoomAssignment]),
    RoomCatalogModule,
    PricingModule,
  ],
  controllers: [
    PublicAvailabilityController,
    CustomerReservationController,
    StaffReservationController,
    ReceptionistReservationController,
  ],
  providers: [
    AvailabilityService,
    CheckInService,
    CheckOutService,
    PaymentEventService,
    ReservationCommandService,
    ReservationQueryService,
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
