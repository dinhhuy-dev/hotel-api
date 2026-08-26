import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import type { PricingQuoteContract } from '../../pricing/contracts/pricing-quote.contract';
import type {
  BookingAvailabilityRoomType,
  BookingRoomCatalogService,
} from '../../room-catalog/contracts/booking-room-catalog.contract';
import type { DataSource, EntityManager } from 'typeorm';
import type { BookingClock } from '../contracts/booking-clock.contract';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';
import type { BookingRepositoryPort } from '../repositories/ports/booking-repository.port';
import { AvailabilityService } from './availability.service';

const FIRST_ROOM_TYPE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SECOND_ROOM_TYPE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const THIRD_ROOM_TYPE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NOW = new Date('2026-08-23T02:00:00.000Z');

function createQuery(overrides: Partial<AvailabilityQueryDto> = {}): AvailabilityQueryDto {
  return Object.assign(new AvailabilityQueryDto(), {
    checkInDate: '2026-09-01',
    checkOutDate: '2026-09-04',
    guestCount: 3,
    roomQuantity: 2,
    page: 1,
    limit: 10,
    ...overrides,
  });
}

function createRoomType(
  id: string,
  overrides: Partial<BookingAvailabilityRoomType> = {},
): BookingAvailabilityRoomType {
  return {
    id,
    name: `Room Type ${id[0]}`,
    description: 'A public Room Type description.',
    maxOccupancy: 2,
    sellableRoomCount: 3,
    facilities: [{ id: `facility-${id[0]}`, name: 'Wi-Fi' }],
    ...overrides,
  };
}

function createQuote(roomTypeId: string, pricePerRoomStay: number) {
  return { roomTypeId, pricePerRoomStay, appliedRates: [] };
}

function optionSignature(
  items: readonly { roomTypeId: string; selectedQuantity: number }[],
): string {
  return items.map((item) => `${item.roomTypeId}:${item.selectedQuantity}`).join('|');
}

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let roomCatalogService: jest.Mocked<Pick<BookingRoomCatalogService, 'findAvailabilityRoomTypes'>>;
  let repository: jest.Mocked<Pick<BookingRepositoryPort, 'findCommittedQuantities'>>;
  let pricingQuoteService: jest.Mocked<Pick<PricingQuoteContract, 'quote'>>;
  let clock: jest.Mocked<BookingClock>;
  let manager: EntityManager;

  beforeEach(() => {
    roomCatalogService = {
      findAvailabilityRoomTypes: jest.fn().mockResolvedValue([createRoomType(FIRST_ROOM_TYPE_ID)]),
    };
    repository = {
      findCommittedQuantities: jest.fn().mockResolvedValue([]),
    };
    pricingQuoteService = {
      quote: jest.fn().mockResolvedValue({
        quotes: [createQuote(FIRST_ROOM_TYPE_ID, 400000)],
        unquotedRoomTypeIds: [],
      }),
    };
    clock = {
      today: jest.fn().mockReturnValue('2026-08-23'),
      now: jest.fn().mockReturnValue(NOW),
    };
    manager = {} as EntityManager;
    service = new AvailabilityService(roomCatalogService, repository, pricingQuoteService, clock, {
      manager,
    } as DataSource);
  });

  it('returns a priced option with public Room Type facts and exact dependency calls', async () => {
    const dto = createQuery({ roomTypeId: FIRST_ROOM_TYPE_ID });

    const result = await service.search(dto);

    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result).toEqual(
      new PaginatedResult(
        [
          {
            items: [
              {
                roomTypeId: FIRST_ROOM_TYPE_ID,
                name: 'Room Type a',
                description: 'A public Room Type description.',
                selectedQuantity: 2,
                maxOccupancy: 2,
                availableQuantity: 3,
                pricePerRoomStay: 400000,
                subtotal: 800000,
                facilities: [{ id: 'facility-a', name: 'Wi-Fi' }],
              },
            ],
            totalRoomQuantity: 2,
            totalCapacity: 4,
            totalPrice: 800000,
          },
        ],
        { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      ),
    );
    expect(roomCatalogService.findAvailabilityRoomTypes).toHaveBeenCalledWith(
      { roomTypeIds: [FIRST_ROOM_TYPE_ID], lockForUpdate: false },
      manager,
    );
    expect(repository.findCommittedQuantities).toHaveBeenCalledWith(
      [FIRST_ROOM_TYPE_ID],
      '2026-09-01',
      '2026-09-04',
      NOW,
    );
    expect(pricingQuoteService.quote).toHaveBeenCalledWith({
      roomTypeIds: [FIRST_ROOM_TYPE_ID],
      checkInDate: '2026-09-01',
      checkOutDate: '2026-09-04',
    });
  });

  it.each([
    ['a check-in before the hotel-local current date', { checkInDate: '2026-08-22' }],
    ['a check-out equal to check-in', { checkInDate: '2026-09-01', checkOutDate: '2026-09-01' }],
    ['a check-out before check-in', { checkInDate: '2026-09-02', checkOutDate: '2026-09-01' }],
    ['a stay longer than 30 nights', { checkInDate: '2026-09-01', checkOutDate: '2026-10-02' }],
  ])('rejects %s before reading dependencies', async (_case, overrides) => {
    await expect(service.search(createQuery(overrides))).rejects.toMatchObject({
      response: { error: 'INVALID_AVAILABILITY_SEARCH' },
    });
    expect(roomCatalogService.findAvailabilityRoomTypes).not.toHaveBeenCalled();
    expect(repository.findCommittedQuantities).not.toHaveBeenCalled();
    expect(pricingQuoteService.quote).not.toHaveBeenCalled();
  });

  it('allows a stay of exactly 30 nights', async () => {
    const result = await service.search(
      createQuery({ checkInDate: '2026-09-01', checkOutDate: '2026-10-01' }),
    );

    expect(result.pagination.totalItems).toBe(1);
  });

  it('rejects more than 10 positive candidates with complete Pricing coverage', async () => {
    const roomTypes = Array.from({ length: 11 }, (_, index) => {
      const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
      return createRoomType(id, { sellableRoomCount: 1 });
    });
    roomCatalogService.findAvailabilityRoomTypes.mockResolvedValue([...roomTypes].reverse());
    pricingQuoteService.quote.mockResolvedValue({
      quotes: roomTypes.map((roomType) => createQuote(roomType.id, 100000)),
      unquotedRoomTypeIds: [],
    });

    await expect(
      service.search(createQuery({ guestCount: 1, roomQuantity: 1 })),
    ).rejects.toMatchObject({
      response: { error: 'AVAILABILITY_SEARCH_TOO_BROAD' },
    });
    expect(roomCatalogService.findAvailabilityRoomTypes).toHaveBeenCalledWith(
      { lockForUpdate: false },
      manager,
    );
    expect(repository.findCommittedQuantities).toHaveBeenCalledWith(
      roomTypes.map((roomType) => roomType.id),
      '2026-09-01',
      '2026-09-04',
      NOW,
    );
  });

  it('excludes fully committed Room Types and Room Types with Pricing gaps', async () => {
    roomCatalogService.findAvailabilityRoomTypes.mockResolvedValue([
      createRoomType(FIRST_ROOM_TYPE_ID, { sellableRoomCount: 2 }),
      createRoomType(SECOND_ROOM_TYPE_ID, { sellableRoomCount: 2 }),
      createRoomType(THIRD_ROOM_TYPE_ID, { sellableRoomCount: 2 }),
    ]);
    repository.findCommittedQuantities.mockResolvedValue([
      { roomTypeId: FIRST_ROOM_TYPE_ID, quantity: 2 },
      { roomTypeId: SECOND_ROOM_TYPE_ID, quantity: 1 },
    ]);
    pricingQuoteService.quote.mockResolvedValue({
      quotes: [createQuote(FIRST_ROOM_TYPE_ID, 100000), createQuote(SECOND_ROOM_TYPE_ID, 200000)],
      unquotedRoomTypeIds: [THIRD_ROOM_TYPE_ID],
    });

    const result = await service.search(createQuery({ guestCount: 2, roomQuantity: 1 }));

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      items: [
        {
          roomTypeId: SECOND_ROOM_TYPE_ID,
          selectedQuantity: 1,
          availableQuantity: 1,
        },
      ],
      totalPrice: 200000,
    });
  });

  it('generates, prunes, and deterministically sorts mixed options', async () => {
    roomCatalogService.findAvailabilityRoomTypes.mockResolvedValue([
      createRoomType(THIRD_ROOM_TYPE_ID, { maxOccupancy: 1, sellableRoomCount: 2 }),
      createRoomType(FIRST_ROOM_TYPE_ID, { maxOccupancy: 2, sellableRoomCount: 2 }),
      createRoomType(SECOND_ROOM_TYPE_ID, { maxOccupancy: 4, sellableRoomCount: 2 }),
    ]);
    pricingQuoteService.quote.mockResolvedValue({
      quotes: [
        createQuote(FIRST_ROOM_TYPE_ID, 100000),
        createQuote(SECOND_ROOM_TYPE_ID, 150000),
        createQuote(THIRD_ROOM_TYPE_ID, 100000),
      ],
      unquotedRoomTypeIds: [],
    });

    const result = await service.search(createQuery({ guestCount: 2, roomQuantity: 2, limit: 50 }));

    expect(result.items.map((option) => optionSignature(option.items))).toEqual([
      `${FIRST_ROOM_TYPE_ID}:2`,
      `${THIRD_ROOM_TYPE_ID}:2`,
      `${FIRST_ROOM_TYPE_ID}:1|${THIRD_ROOM_TYPE_ID}:1`,
      `${FIRST_ROOM_TYPE_ID}:1|${SECOND_ROOM_TYPE_ID}:1`,
      `${SECOND_ROOM_TYPE_ID}:1|${THIRD_ROOM_TYPE_ID}:1`,
      `${SECOND_ROOM_TYPE_ID}:2`,
    ]);
    expect(result.items.map((option) => option.totalPrice)).toEqual([
      200000, 200000, 200000, 250000, 250000, 300000,
    ]);
    expect(result.pagination.totalItems).toBe(6);
    expect(pricingQuoteService.quote).toHaveBeenCalledWith({
      roomTypeIds: [FIRST_ROOM_TYPE_ID, SECOND_ROOM_TYPE_ID, THIRD_ROOM_TYPE_ID],
      checkInDate: '2026-09-01',
      checkOutDate: '2026-09-04',
    });
  });

  it('paginates the exact generated option set through a real PaginatedResult', async () => {
    roomCatalogService.findAvailabilityRoomTypes.mockResolvedValue([
      createRoomType(FIRST_ROOM_TYPE_ID, { sellableRoomCount: 2 }),
      createRoomType(SECOND_ROOM_TYPE_ID, { sellableRoomCount: 2 }),
      createRoomType(THIRD_ROOM_TYPE_ID, { sellableRoomCount: 2 }),
    ]);
    pricingQuoteService.quote.mockResolvedValue({
      quotes: [
        createQuote(FIRST_ROOM_TYPE_ID, 100000),
        createQuote(SECOND_ROOM_TYPE_ID, 100000),
        createQuote(THIRD_ROOM_TYPE_ID, 100000),
      ],
      unquotedRoomTypeIds: [],
    });

    const result = await service.search(
      createQuery({ guestCount: 1, roomQuantity: 2, page: 2, limit: 2 }),
    );

    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.items).toHaveLength(2);
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 2,
      totalItems: 6,
      totalPages: 3,
    });
  });

  it('returns an empty exact page without reading commitments or Pricing when no Room Type matches', async () => {
    roomCatalogService.findAvailabilityRoomTypes.mockResolvedValue([]);

    const result = await service.search(createQuery({ page: 2, limit: 5 }));

    expect(result).toEqual(
      new PaginatedResult([], {
        page: 2,
        pageSize: 5,
        totalItems: 0,
        totalPages: 0,
      }),
    );
    expect(repository.findCommittedQuantities).not.toHaveBeenCalled();
    expect(pricingQuoteService.quote).not.toHaveBeenCalled();
  });
});
