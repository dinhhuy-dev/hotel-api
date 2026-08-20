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
import { ManagementFacilityController } from './controller/facility.controller';
import { FacilityService } from './services/facility.service';

describe('RoomCatalogModule', () => {
  it('registers the room catalog providers and repository aliases', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      RoomCatalogModule,
    ) as unknown[];

    expect(RoomCatalogModule).toBeDefined();
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, RoomCatalogModule)).toEqual([
      ManagementFacilityController,
    ]);
    expect(providers).toEqual(
      expect.arrayContaining([
        FacilityService,
        TypeOrmFacilityRepository,
        TypeOrmRoomTypeRepository,
        TypeOrmRoomRepository,
        expect.objectContaining({
          provide: FACILITY_REPOSITORY,
          useExisting: TypeOrmFacilityRepository,
        }),
        expect.objectContaining({
          provide: ROOM_TYPE_REPOSITORY,
          useExisting: TypeOrmRoomTypeRepository,
        }),
        expect.objectContaining({ provide: ROOM_REPOSITORY, useExisting: TypeOrmRoomRepository }),
      ]),
    );
  });
});
