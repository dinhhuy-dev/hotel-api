import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Facility } from './entities/facility.entity';
import { RoomType } from './entities/room-type.entity';
import { Room } from './entities/room.entity';
import { RoomTypeFacility } from './entities/room-type-facility.entity';
import { TypeOrmFacilityRepository } from './repositories/typeorm/typeorm-facility.repository';
import { TypeOrmRoomTypeRepository } from './repositories/typeorm/typeorm-room-type.repository';
import { TypeOrmRoomRepository } from './repositories/typeorm/typeorm-room.repository';
import {
  FACILITY_REPOSITORY,
  ROOM_REPOSITORY,
  ROOM_TYPE_REPOSITORY,
} from './repositories/ports/room-catalog-repository.token';
import { ManagementFacilityController } from './controller/management-facility.controller';
import { FacilityService } from './services/facility.service';
import { ManagementRoomTypeController } from './controller/management-room-type.controller';
import { PublicRoomTypeController } from './controller/public-room-type.controller';
import { RoomTypeService } from './services/room-type.service';
import { ManagementRoomController } from './controller/management-room.controller';
import { StaffRoomController } from './controller/staff-room.controller';
import { RoomService } from './services/room.service';
import { PRICING_ROOM_TYPE_QUERY } from './contracts/pricing-room-type-query.contract';
import { BOOKING_ROOM_CATALOG_SERVICE } from './contracts/booking-room-catalog.contract';
import { TypeOrmBookingRoomCatalogService } from './repositories/typeorm/typeorm-booking-room-catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([Facility, RoomType, Room, RoomTypeFacility])],
  controllers: [
    ManagementFacilityController,
    ManagementRoomTypeController,
    PublicRoomTypeController,
    ManagementRoomController,
    StaffRoomController,
  ],
  providers: [
    FacilityService,
    RoomTypeService,
    RoomService,
    TypeOrmFacilityRepository,
    TypeOrmRoomTypeRepository,
    TypeOrmRoomRepository,
    TypeOrmBookingRoomCatalogService,
    {
      provide: FACILITY_REPOSITORY,
      useExisting: TypeOrmFacilityRepository,
    },
    {
      provide: ROOM_TYPE_REPOSITORY,
      useExisting: TypeOrmRoomTypeRepository,
    },
    {
      provide: ROOM_REPOSITORY,
      useExisting: TypeOrmRoomRepository,
    },
    {
      provide: PRICING_ROOM_TYPE_QUERY,
      useExisting: RoomTypeService,
    },
    {
      provide: BOOKING_ROOM_CATALOG_SERVICE,
      useExisting: TypeOrmBookingRoomCatalogService,
    },
  ],
  exports: [PRICING_ROOM_TYPE_QUERY, BOOKING_ROOM_CATALOG_SERVICE],
})
export class RoomCatalogModule {}
