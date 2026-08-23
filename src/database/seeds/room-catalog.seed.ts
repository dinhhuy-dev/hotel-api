import { EntityManager, ILike } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Facility } from '../../modules/room-catalog/entities/facility.entity';
import { OperationalStatus } from '../../modules/room-catalog/entities/enum/operational-status';
import { RoomTypeFacility } from '../../modules/room-catalog/entities/room-type-facility.entity';
import { RoomType } from '../../modules/room-catalog/entities/room-type.entity';
import { Room } from '../../modules/room-catalog/entities/room.entity';

interface FacilitySeed {
  name: string;
  description: string;
  isActive: boolean;
}

interface RoomTypeSeed {
  code: string;
  name: string;
  description: string;
  maxOccupancy: number;
  bedConfiguration: string;
  displayOrder: number;
  facilityNames: readonly string[];
}

interface RoomSeed {
  roomNumber: string;
  floor: string;
  roomTypeCode: string;
  operationalStatus: OperationalStatus;
}

interface RoomCatalogSeedResult {
  facilitiesCreated: number;
  roomTypesCreated: number;
  assignmentsCreated: number;
  roomsCreated: number;
}

const FACILITY_SEEDS: readonly FacilitySeed[] = [
  {
    name: 'Wi-Fi',
    description: 'Wireless internet access.',
    isActive: true,
  },
  {
    name: 'Air Conditioning',
    description: 'In-room air conditioning.',
    isActive: true,
  },
  {
    name: 'Television',
    description: 'In-room television.',
    isActive: true,
  },
  {
    name: 'Minibar',
    description: 'In-room minibar service.',
    isActive: false,
  },
  {
    name: 'Airport Shuttle',
    description: 'Hotel airport shuttle service.',
    isActive: false,
  },
];

const ROOM_TYPE_SEEDS: readonly RoomTypeSeed[] = [
  {
    code: 'STD',
    name: 'Standard Room',
    description: 'Comfortable room for one or two guests.',
    maxOccupancy: 2,
    bedConfiguration: 'One queen bed',
    displayOrder: 1,
    facilityNames: ['Wi-Fi', 'Air Conditioning'],
  },
  {
    code: 'DLX',
    name: 'Deluxe Room',
    description: 'Spacious room with additional seating.',
    maxOccupancy: 3,
    bedConfiguration: 'One king bed and one sofa bed',
    displayOrder: 2,
    facilityNames: ['Wi-Fi', 'Air Conditioning', 'Television'],
  },
  {
    code: 'FAM',
    name: 'Family Room',
    description: 'Room for families or small groups.',
    maxOccupancy: 4,
    bedConfiguration: 'Two queen beds',
    displayOrder: 3,
    facilityNames: ['Wi-Fi', 'Air Conditioning', 'Television'],
  },
];

const ROOM_SEEDS: readonly RoomSeed[] = [
  {
    roomNumber: '101',
    floor: '1',
    roomTypeCode: 'STD',
    operationalStatus: OperationalStatus.Ready,
  },
  {
    roomNumber: '102',
    floor: '1',
    roomTypeCode: 'STD',
    operationalStatus: OperationalStatus.Dirty,
  },
  {
    roomNumber: '201',
    floor: '2',
    roomTypeCode: 'DLX',
    operationalStatus: OperationalStatus.Cleaning,
  },
  {
    roomNumber: '202',
    floor: '2',
    roomTypeCode: 'DLX',
    operationalStatus: OperationalStatus.OutOfService,
  },
  {
    roomNumber: '301',
    floor: '3',
    roomTypeCode: 'FAM',
    operationalStatus: OperationalStatus.Ready,
  },
  {
    roomNumber: '302',
    floor: '3',
    roomTypeCode: 'FAM',
    operationalStatus: OperationalStatus.Retired,
  },
];

async function seedFacilities(
  manager: EntityManager,
): Promise<{ facilities: Map<string, Facility>; createdCount: number }> {
  const facilityRepository = manager.getRepository(Facility);
  const facilities = new Map<string, Facility>();
  let createdCount = 0;

  for (const seed of FACILITY_SEEDS) {
    const existingFacility = await facilityRepository.findOne({
      where: { name: ILike(seed.name) },
    });

    if (existingFacility) {
      if (
        existingFacility.name !== seed.name ||
        existingFacility.description !== seed.description ||
        existingFacility.isActive !== seed.isActive
      ) {
        throw new Error(`Existing facility conflicts with Room Catalog seed: ${seed.name}`);
      }

      facilities.set(seed.name, existingFacility);
      continue;
    }

    const facility = await facilityRepository.save(
      facilityRepository.create({
        name: seed.name,
        description: seed.description,
        isActive: seed.isActive,
      }),
    );

    facilities.set(seed.name, facility);
    createdCount += 1;
  }

  return { facilities, createdCount };
}

async function seedRoomTypes(
  manager: EntityManager,
): Promise<{ roomTypes: Map<string, RoomType>; createdCount: number }> {
  const roomTypeRepository = manager.getRepository(RoomType);
  const roomTypes = new Map<string, RoomType>();
  let createdCount = 0;

  for (const seed of ROOM_TYPE_SEEDS) {
    const existingRoomType = await roomTypeRepository.findOneBy({ code: seed.code });

    if (existingRoomType) {
      if (
        existingRoomType.name !== seed.name ||
        existingRoomType.description !== seed.description ||
        existingRoomType.maxOccupancy !== seed.maxOccupancy ||
        existingRoomType.bedConfiguration !== seed.bedConfiguration ||
        existingRoomType.displayOrder !== seed.displayOrder ||
        !existingRoomType.isActive
      ) {
        throw new Error(`Existing room type conflicts with Room Catalog seed: ${seed.code}`);
      }

      roomTypes.set(seed.code, existingRoomType);
      continue;
    }

    const roomType = await roomTypeRepository.save(
      roomTypeRepository.create({
        code: seed.code,
        name: seed.name,
        description: seed.description,
        maxOccupancy: seed.maxOccupancy,
        bedConfiguration: seed.bedConfiguration,
        displayOrder: seed.displayOrder,
        isActive: true,
      }),
    );

    roomTypes.set(seed.code, roomType);
    createdCount += 1;
  }

  return { roomTypes, createdCount };
}

async function seedRoomTypeFacilities(
  manager: EntityManager,
  facilities: ReadonlyMap<string, Facility>,
  roomTypes: ReadonlyMap<string, RoomType>,
): Promise<number> {
  const assignmentRepository = manager.getRepository(RoomTypeFacility);
  let createdCount = 0;

  for (const roomTypeSeed of ROOM_TYPE_SEEDS) {
    const roomType = requireMapValue(roomTypes, roomTypeSeed.code, 'room type');

    for (const facilityName of roomTypeSeed.facilityNames) {
      const facility = requireMapValue(facilities, facilityName, 'facility');
      const existingAssignment = await assignmentRepository.findOneBy({
        roomTypeId: roomType.id,
        facilityId: facility.id,
      });

      if (existingAssignment) {
        continue;
      }

      await assignmentRepository.save(
        assignmentRepository.create({
          roomTypeId: roomType.id,
          facilityId: facility.id,
        }),
      );
      createdCount += 1;
    }
  }

  return createdCount;
}

async function seedRooms(
  manager: EntityManager,
  roomTypes: ReadonlyMap<string, RoomType>,
): Promise<number> {
  const roomRepository = manager.getRepository(Room);
  let createdCount = 0;

  for (const seed of ROOM_SEEDS) {
    const roomType = requireMapValue(roomTypes, seed.roomTypeCode, 'room type');
    const existingRoom = await roomRepository.findOneBy({ roomNumber: seed.roomNumber });

    if (existingRoom) {
      if (
        existingRoom.floor !== seed.floor ||
        existingRoom.roomTypeId !== roomType.id ||
        existingRoom.operationalStatus !== seed.operationalStatus
      ) {
        throw new Error(`Existing room conflicts with Room Catalog seed: ${seed.roomNumber}`);
      }

      continue;
    }

    await roomRepository.save(
      roomRepository.create({
        roomNumber: seed.roomNumber,
        floor: seed.floor,
        roomTypeId: roomType.id,
        operationalStatus: seed.operationalStatus,
      }),
    );
    createdCount += 1;
  }

  return createdCount;
}

async function seedRoomCatalog(manager: EntityManager): Promise<RoomCatalogSeedResult> {
  const facilityResult = await seedFacilities(manager);
  const roomTypeResult = await seedRoomTypes(manager);
  const assignmentsCreated = await seedRoomTypeFacilities(
    manager,
    facilityResult.facilities,
    roomTypeResult.roomTypes,
  );
  const roomsCreated = await seedRooms(manager, roomTypeResult.roomTypes);

  return {
    facilitiesCreated: facilityResult.createdCount,
    roomTypesCreated: roomTypeResult.createdCount,
    assignmentsCreated,
    roomsCreated,
  };
}

function requireMapValue<T>(values: ReadonlyMap<string, T>, key: string, valueName: string): T {
  const value = values.get(key);

  if (!value) {
    throw new Error(`Room Catalog seed could not resolve ${valueName}: ${key}`);
  }

  return value;
}

function assertDevelopmentEnvironment(): void {
  if (process.env['NODE_ENV']?.trim().toLowerCase() === 'production') {
    throw new Error('Room Catalog seed cannot run in production.');
  }
}

async function runRoomCatalogSeed(): Promise<void> {
  assertDevelopmentEnvironment();

  try {
    await AppDataSource.initialize();
    const result = await AppDataSource.transaction(seedRoomCatalog);

    console.log(
      'Room Catalog seed completed: ' +
        `${result.facilitiesCreated} facilities, ` +
        `${result.roomTypesCreated} room types, ` +
        `${result.assignmentsCreated} facility assignments, and ` +
        `${result.roomsCreated} rooms created.`,
    );
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runRoomCatalogSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown Room Catalog seed error.';

  console.error(`Room Catalog seed failed: ${message}`);
  process.exitCode = 1;
});
