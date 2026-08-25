import { BulkRoomTypeQuoteRequestDto } from '../dto/bulk-room-type-quote-request.dto';
import { RoomRate } from '../entities/room-rate.entity';
import type { RoomRateRepositoryPort } from '../repositories/ports/room-rate-repository.port';
import { PricingQuoteService } from './pricing-quote.service';

const FIRST_ROOM_TYPE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SECOND_ROOM_TYPE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const THIRD_ROOM_TYPE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function createRequest(
  overrides: Partial<BulkRoomTypeQuoteRequestDto> = {},
): BulkRoomTypeQuoteRequestDto {
  return Object.assign(new BulkRoomTypeQuoteRequestDto(), {
    roomTypeIds: [FIRST_ROOM_TYPE_ID],
    checkInDate: '2026-09-03',
    checkOutDate: '2026-09-12',
    ...overrides,
  });
}

function createRoomRate(
  id: string,
  roomTypeId: string,
  startDate: string,
  endDate: string,
  pricePerNight: number,
): RoomRate {
  return Object.assign(new RoomRate(), {
    id,
    roomTypeId,
    startDate,
    endDate,
    pricePerNight,
    createdAt: new Date('2026-08-23T01:00:00.000Z'),
    updatedAt: new Date('2026-08-23T01:00:00.000Z'),
  });
}

describe('PricingQuoteService', () => {
  let service: PricingQuoteService;
  let repository: jest.Mocked<Pick<RoomRateRepositoryPort, 'findOverlappingForRoomTypes'>>;

  beforeEach(() => {
    repository = {
      findOverlappingForRoomTypes: jest.fn(),
    };
    service = new PricingQuoteService(repository);
  });

  it('returns one clipped applied rate for complete single-range coverage', async () => {
    repository.findOverlappingForRoomTypes.mockResolvedValue([
      createRoomRate(
        '11111111-1111-4111-8111-111111111111',
        FIRST_ROOM_TYPE_ID,
        '2026-09-01',
        '2026-09-15',
        1000000,
      ),
    ]);

    await expect(service.quote(createRequest())).resolves.toEqual({
      quotes: [
        {
          roomTypeId: FIRST_ROOM_TYPE_ID,
          pricePerRoomStay: 9000000,
          appliedRates: [
            {
              roomRateId: '11111111-1111-4111-8111-111111111111',
              rateStartDate: '2026-09-01',
              rateEndDate: '2026-09-15',
              appliedStartDate: '2026-09-03',
              appliedEndDate: '2026-09-12',
              pricePerNight: 1000000,
              nightCount: 9,
              subtotal: 9000000,
            },
          ],
        },
      ],
      unquotedRoomTypeIds: [],
    });
  });

  it('returns all three chronological rates with clipped first and last boundaries', async () => {
    repository.findOverlappingForRoomTypes.mockResolvedValue([
      createRoomRate(
        '33333333-3333-4333-8333-333333333333',
        FIRST_ROOM_TYPE_ID,
        '2026-09-10',
        '2026-09-15',
        3000000,
      ),
      createRoomRate(
        '11111111-1111-4111-8111-111111111111',
        FIRST_ROOM_TYPE_ID,
        '2026-09-01',
        '2026-09-05',
        1000000,
      ),
      createRoomRate(
        '22222222-2222-4222-8222-222222222222',
        FIRST_ROOM_TYPE_ID,
        '2026-09-05',
        '2026-09-10',
        2000000,
      ),
    ]);

    const result = await service.quote(createRequest());

    expect(result.quotes).toEqual([
      {
        roomTypeId: FIRST_ROOM_TYPE_ID,
        pricePerRoomStay: 18000000,
        appliedRates: [
          expect.objectContaining({
            roomRateId: '11111111-1111-4111-8111-111111111111',
            rateStartDate: '2026-09-01',
            appliedStartDate: '2026-09-03',
            appliedEndDate: '2026-09-05',
            nightCount: 2,
            subtotal: 2000000,
          }),
          expect.objectContaining({
            roomRateId: '22222222-2222-4222-8222-222222222222',
            appliedStartDate: '2026-09-05',
            appliedEndDate: '2026-09-10',
            nightCount: 5,
            subtotal: 10000000,
          }),
          expect.objectContaining({
            roomRateId: '33333333-3333-4333-8333-333333333333',
            rateEndDate: '2026-09-15',
            appliedStartDate: '2026-09-10',
            appliedEndDate: '2026-09-12',
            nightCount: 2,
            subtotal: 6000000,
          }),
        ],
      },
    ]);
  });

  it('returns a Room Type as unquoted when stored rates have a gap', async () => {
    repository.findOverlappingForRoomTypes.mockResolvedValue([
      createRoomRate(
        '11111111-1111-4111-8111-111111111111',
        FIRST_ROOM_TYPE_ID,
        '2026-09-01',
        '2026-09-05',
        1000000,
      ),
      createRoomRate(
        '22222222-2222-4222-8222-222222222222',
        FIRST_ROOM_TYPE_ID,
        '2026-09-06',
        '2026-09-15',
        2000000,
      ),
    ]);

    await expect(service.quote(createRequest())).resolves.toEqual({
      quotes: [],
      unquotedRoomTypeIds: [FIRST_ROOM_TYPE_ID],
    });
  });

  it('returns a Room Type as unquoted when more than one rate covers a night', async () => {
    repository.findOverlappingForRoomTypes.mockResolvedValue([
      createRoomRate(
        '11111111-1111-4111-8111-111111111111',
        FIRST_ROOM_TYPE_ID,
        '2026-09-01',
        '2026-09-15',
        1000000,
      ),
      createRoomRate(
        '22222222-2222-4222-8222-222222222222',
        FIRST_ROOM_TYPE_ID,
        '2026-09-07',
        '2026-09-10',
        2000000,
      ),
    ]);

    await expect(service.quote(createRequest())).resolves.toEqual({
      quotes: [],
      unquotedRoomTypeIds: [FIRST_ROOM_TYPE_ID],
    });
  });

  it('uses one bulk read and preserves input order in both result arrays', async () => {
    const request = createRequest({
      roomTypeIds: [SECOND_ROOM_TYPE_ID, FIRST_ROOM_TYPE_ID, THIRD_ROOM_TYPE_ID],
      checkInDate: '2026-09-03',
      checkOutDate: '2026-09-05',
    });
    repository.findOverlappingForRoomTypes.mockResolvedValue([
      createRoomRate(
        '11111111-1111-4111-8111-111111111111',
        FIRST_ROOM_TYPE_ID,
        '2026-09-01',
        '2026-09-10',
        1000000,
      ),
      createRoomRate(
        '22222222-2222-4222-8222-222222222222',
        SECOND_ROOM_TYPE_ID,
        '2026-09-01',
        '2026-09-10',
        2000000,
      ),
    ]);

    const result = await service.quote(request);

    expect(repository.findOverlappingForRoomTypes).toHaveBeenCalledTimes(1);
    expect(repository.findOverlappingForRoomTypes).toHaveBeenCalledWith(
      [SECOND_ROOM_TYPE_ID, FIRST_ROOM_TYPE_ID, THIRD_ROOM_TYPE_ID],
      '2026-09-03',
      '2026-09-05',
    );
    expect(result.quotes.map((quote) => quote.roomTypeId)).toEqual([
      SECOND_ROOM_TYPE_ID,
      FIRST_ROOM_TYPE_ID,
    ]);
    expect(result.unquotedRoomTypeIds).toEqual([THIRD_ROOM_TYPE_ID]);
  });

  it.each([
    ['an empty Room Type list', { roomTypeIds: [] }],
    ['duplicate Room Type identifiers', { roomTypeIds: [FIRST_ROOM_TYPE_ID, FIRST_ROOM_TYPE_ID] }],
    ['a non-UUID Room Type identifier', { roomTypeIds: ['not-a-uuid'] }],
    ['a non-calendar check-in date', { checkInDate: '2026-02-30' }],
    ['a non-ISO check-out date', { checkOutDate: '2026/09/12' }],
  ])('rejects %s through request DTO validation', async (_case, overrides) => {
    await expect(service.quote(createRequest(overrides))).rejects.toMatchObject({
      response: { error: 'INVALID_QUOTE_REQUEST' },
    });
    expect(repository.findOverlappingForRoomTypes).not.toHaveBeenCalled();
  });

  it.each([
    ['an equal range', { checkOutDate: '2026-09-03' }],
    ['a reversed range', { checkOutDate: '2026-09-02' }],
  ])('rejects %s in the service layer', async (_case, overrides) => {
    await expect(service.quote(createRequest(overrides))).rejects.toMatchObject({
      response: { error: 'INVALID_QUOTE_RANGE' },
    });
    expect(repository.findOverlappingForRoomTypes).not.toHaveBeenCalled();
  });
});
