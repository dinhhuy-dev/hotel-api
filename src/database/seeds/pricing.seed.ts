import { EntityManager, In, LessThan, MoreThan } from 'typeorm';
import { AppDataSource } from '../data-source';
import { RoomType } from '../../modules/room-catalog/entities/room-type.entity';
import { RoomRate } from '../../modules/pricing/entities/room-rate.entity';

interface RoomRateSeed {
  roomTypeCode: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
}

interface PricingSeedResult {
  createdCount: number;
  existingCount: number;
}

const ROOM_RATE_SEEDS: readonly RoomRateSeed[] = [
  {
    roomTypeCode: 'STD',
    startDate: '2030-01-01',
    endDate: '2030-01-10',
    pricePerNight: 800_000,
  },
  {
    roomTypeCode: 'STD',
    startDate: '2030-01-10',
    endDate: '2030-01-20',
    pricePerNight: 900_000,
  },
  {
    roomTypeCode: 'DLX',
    startDate: '2030-01-01',
    endDate: '2030-01-20',
    pricePerNight: 1_200_000,
  },
  {
    roomTypeCode: 'FAM',
    startDate: '2030-01-01',
    endDate: '2030-01-08',
    pricePerNight: 1_600_000,
  },
  {
    roomTypeCode: 'FAM',
    startDate: '2030-01-10',
    endDate: '2030-01-20',
    pricePerNight: 1_800_000,
  },
];

async function resolveActiveRoomTypes(
  manager: EntityManager,
): Promise<ReadonlyMap<string, RoomType>> {
  const roomTypeRepository = manager.getRepository(RoomType);
  const roomTypeCodes = [...new Set(ROOM_RATE_SEEDS.map((seed) => seed.roomTypeCode))];
  const roomTypes = await roomTypeRepository.findBy({ code: In(roomTypeCodes) });
  const roomTypesByCode = new Map(roomTypes.map((roomType) => [roomType.code, roomType]));

  for (const code of roomTypeCodes) {
    const roomType = roomTypesByCode.get(code);

    if (!roomType) {
      throw new Error(
        `Pricing seed could not resolve Room Type ${code}. Run the Room Catalog seed first.`,
      );
    }

    if (!roomType.isActive) {
      throw new Error(`Pricing seed requires active Room Type: ${code}`);
    }
  }

  return roomTypesByCode;
}

async function seedRoomRates(manager: EntityManager): Promise<PricingSeedResult> {
  const roomRateRepository = manager.getRepository(RoomRate);
  const roomTypesByCode = await resolveActiveRoomTypes(manager);
  let createdCount = 0;
  let existingCount = 0;

  for (const seed of ROOM_RATE_SEEDS) {
    const roomType = roomTypesByCode.get(seed.roomTypeCode);

    if (!roomType) {
      throw new Error(`Pricing seed could not resolve Room Type: ${seed.roomTypeCode}`);
    }

    const overlappingRoomRate = await roomRateRepository.findOne({
      where: {
        roomTypeId: roomType.id,
        startDate: LessThan(seed.endDate),
        endDate: MoreThan(seed.startDate),
      },
    });

    if (overlappingRoomRate) {
      if (
        overlappingRoomRate.startDate === seed.startDate &&
        overlappingRoomRate.endDate === seed.endDate &&
        overlappingRoomRate.pricePerNight === seed.pricePerNight
      ) {
        existingCount += 1;
        continue;
      }

      throw new Error(
        `Existing Room Rate conflicts with Pricing seed: ${seed.roomTypeCode} ` +
          `[${seed.startDate}, ${seed.endDate})`,
      );
    }

    await roomRateRepository.save(
      roomRateRepository.create({
        roomTypeId: roomType.id,
        startDate: seed.startDate,
        endDate: seed.endDate,
        pricePerNight: seed.pricePerNight,
      }),
    );
    createdCount += 1;
  }

  return { createdCount, existingCount };
}

function assertDevelopmentEnvironment(): void {
  if (process.env['NODE_ENV']?.trim().toLowerCase() === 'production') {
    throw new Error('Pricing seed cannot run in production.');
  }
}

async function runPricingSeed(): Promise<void> {
  assertDevelopmentEnvironment();

  try {
    await AppDataSource.initialize();
    const result = await AppDataSource.transaction(seedRoomRates);

    console.log(
      `Pricing seed completed: ${result.createdCount} created, ` +
        `${result.existingCount} already present.`,
    );
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runPricingSeed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown Pricing seed error.';

  console.error(`Pricing seed failed: ${message}`);
  process.exitCode = 1;
});
