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
import { ManagementFacilityController } from './controller/facility.controller';
import { FacilityService } from './services/facility.service';

@Module({
  imports: [TypeOrmModule.forFeature([Facility, RoomType, Room, RoomTypeFacility])],
  controllers: [ManagementFacilityController],
  providers: [
    FacilityService,
    TypeOrmFacilityRepository,
    TypeOrmRoomTypeRepository,
    TypeOrmRoomRepository,
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
  ],
})
export class RoomCatalogModule {}
