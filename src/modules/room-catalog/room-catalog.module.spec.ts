import { MODULE_METADATA } from '@nestjs/common/constants';
import { RoomCatalogModule } from './room-catalog.module';
import {
  FACILITY_REPOSITORY,
  ROOM_REPOSITORY,
  ROOM_TYPE_REPOSITORY,
} from './repositories/ports/room-catalog-repository.token';
import { TypeOrmFacilityRepository } from './repositories/typeorm/typeorm-facility.repository';
import { TypeOrmRoomRepository } from './repositories/typeorm/typeorm-room.repository';
import { TypeOrmRoomTypeRepository } from './repositories/typeorm/typeorm-room-type.repository';
import { ManagementFacilityController } from './controller/management-facility.controller';
import { FacilityService } from './services/facility.service';
import { ManagementRoomTypeController } from './controller/management-room-type.controller';
import { PublicRoomTypeController } from './controller/public-room-type.controller';
import { RoomTypeService } from './services/room-type.service';
import { ManagementRoomController } from './controller/management-room.controller';
import { StaffRoomController } from './controller/staff-room.controller';
import { RoomService } from './services/room.service';
import { BOOKING_ROOM_CATALOG_SERVICE } from './contracts/booking-room-catalog.contract';
import { TypeOrmBookingRoomCatalogService } from './repositories/typeorm/typeorm-booking-room-catalog.service';

describe('RoomCatalogModule', () => {
  it('registers the room catalog providers and repository aliases', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      RoomCatalogModule,
    ) as unknown[];

    expect(RoomCatalogModule).toBeDefined();
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, RoomCatalogModule)).toEqual([
      ManagementFacilityController,
      ManagementRoomTypeController,
      PublicRoomTypeController,
      ManagementRoomController,
      StaffRoomController,
    ]);
    expect(providers).toEqual(
      expect.arrayContaining([
        FacilityService,
        RoomTypeService,
        RoomService,
        TypeOrmFacilityRepository,
        TypeOrmRoomTypeRepository,
        TypeOrmRoomRepository,
        TypeOrmBookingRoomCatalogService,
        expect.objectContaining({
          provide: FACILITY_REPOSITORY,
          useExisting: TypeOrmFacilityRepository,
        }),
        expect.objectContaining({
          provide: ROOM_TYPE_REPOSITORY,
          useExisting: TypeOrmRoomTypeRepository,
        }),
        expect.objectContaining({ provide: ROOM_REPOSITORY, useExisting: TypeOrmRoomRepository }),
        expect.objectContaining({
          provide: BOOKING_ROOM_CATALOG_SERVICE,
          useExisting: TypeOrmBookingRoomCatalogService,
        }),
      ]),
    );

    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, RoomCatalogModule)).toEqual(
      expect.arrayContaining([BOOKING_ROOM_CATALOG_SERVICE]),
    );
  });
});
