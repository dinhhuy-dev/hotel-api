import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomCatalogModule } from '../room-catalog/room-catalog.module';
import { PRICING_QUOTE_SERVICE } from './contracts/pricing-quote.contract';
import { ManagementRoomRateController } from './controller/management-room-rate.controller';
import { RoomRate } from './entities/room-rate.entity';
import { ROOM_RATE_REPOSITORY } from './repositories/ports/pricing-repository.token';
import { TypeOrmRoomRateRepository } from './repositories/typeorm/typeorm-room-rate.repository';
import { HOTEL_LOCAL_CLOCK, SystemHotelLocalClock } from './services/hotel-local-clock';
import { PricingQuoteService } from './services/pricing-quote.service';
import { RoomRateService } from './services/room-rate.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoomRate]), RoomCatalogModule],
  controllers: [ManagementRoomRateController],
  providers: [
    TypeOrmRoomRateRepository,
    SystemHotelLocalClock,
    PricingQuoteService,
    RoomRateService,
    {
      provide: ROOM_RATE_REPOSITORY,
      useExisting: TypeOrmRoomRateRepository,
    },
    {
      provide: HOTEL_LOCAL_CLOCK,
      useExisting: SystemHotelLocalClock,
    },
    {
      provide: PRICING_QUOTE_SERVICE,
      useExisting: PricingQuoteService,
    },
  ],
  exports: [PRICING_QUOTE_SERVICE],
})
export class PricingModule {}
