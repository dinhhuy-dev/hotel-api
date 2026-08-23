import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import type { PricingRoomTypeQuery } from 'src/modules/room-catalog/contracts/pricing-room-type-query.contract';
import { CreateRoomRateDto } from '../dto/create-room-rate.dto';
import { RoomRateQueryDto } from '../dto/room-rate-query.dto';
import { RoomRate } from '../entities/room-rate.entity';
import type { RoomRateRepositoryPort } from '../repositories/ports/room-rate-repository.port';
import type { HotelLocalClock } from './hotel-local-clock';
import { RoomRateService } from './room-rate.service';

const ROOM_TYPE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ROOM_RATE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function createRoomRate(overrides: Partial<RoomRate> = {}): RoomRate {
  return Object.assign(new RoomRate(), {
    id: ROOM_RATE_ID,
    roomTypeId: ROOM_TYPE_ID,
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    pricePerNight: 1250000,
    createdAt: new Date('2026-08-23T01:00:00.000Z'),
    updatedAt: new Date('2026-08-23T01:00:00.000Z'),
    ...overrides,
  });
}

describe('RoomRateService', () => {
  let service: RoomRateService;
  let repository: jest.Mocked<
    Pick<RoomRateRepositoryPort, 'save' | 'findPage' | 'findById' | 'hasOverlap' | 'remove'>
  >;
  let roomTypeQuery: jest.Mocked<Pick<PricingRoomTypeQuery, 'findById'>>;
  let clock: jest.Mocked<Pick<HotelLocalClock, 'currentDate'>>;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findPage: jest.fn(),
      findById: jest.fn(),
      hasOverlap: jest.fn().mockResolvedValue(false),
      remove: jest.fn(),
    };
    roomTypeQuery = {
      findById: jest.fn().mockResolvedValue({ id: ROOM_TYPE_ID, isActive: true }),
    };
    clock = {
      currentDate: jest.fn().mockReturnValue('2026-08-23'),
    };
    service = new RoomRateService(repository, roomTypeQuery, clock);
  });

  describe('create', () => {
    const dto: CreateRoomRateDto = {
      roomTypeId: ROOM_TYPE_ID,
      startDate: '2026-09-01',
      endDate: '2026-09-05',
      pricePerNight: 1250000,
    };

    it('creates a future rate for an active Room Type', async () => {
      const roomRate = createRoomRate();
      repository.save.mockResolvedValue(roomRate);

      await expect(service.create(dto)).resolves.toEqual({
        id: roomRate.id,
        roomTypeId: roomRate.roomTypeId,
        startDate: roomRate.startDate,
        endDate: roomRate.endDate,
        pricePerNight: roomRate.pricePerNight,
        createdAt: '2026-08-23T01:00:00.000Z',
        updatedAt: '2026-08-23T01:00:00.000Z',
      });
      expect(roomTypeQuery.findById).toHaveBeenCalledWith(ROOM_TYPE_ID);
      expect(repository.hasOverlap).toHaveBeenCalledWith(ROOM_TYPE_ID, '2026-09-01', '2026-09-05');
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roomTypeId: ROOM_TYPE_ID,
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          pricePerNight: 1250000,
        }),
      );
    });

    it('rejects an unknown Room Type', async () => {
      roomTypeQuery.findById.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toMatchObject({
        response: { error: 'ROOM_TYPE_NOT_FOUND' },
      });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects an inactive Room Type', async () => {
      roomTypeQuery.findById.mockResolvedValue({ id: ROOM_TYPE_ID, isActive: false });

      await expect(service.create(dto)).rejects.toMatchObject({
        response: { error: 'INACTIVE_ROOM_TYPE' },
      });
    });

    it.each([
      ['the current hotel date', { ...dto, startDate: '2026-08-23' }],
      ['a reversed range', { ...dto, startDate: '2026-09-05', endDate: '2026-09-01' }],
    ])('rejects %s', async (_case, invalidDto) => {
      await expect(service.create(invalidDto)).rejects.toMatchObject({
        response: { error: 'INVALID_ROOM_RATE_RANGE' },
      });
      expect(roomTypeQuery.findById).not.toHaveBeenCalled();
    });

    it('rejects an overlapping range before saving', async () => {
      repository.hasOverlap.mockResolvedValue(true);

      await expect(service.create(dto)).rejects.toMatchObject({
        response: { error: 'ROOM_RATE_OVERLAP' },
      });
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('list and detail', () => {
    it('returns a real PaginatedResult after overlap filtering', async () => {
      const dto = Object.assign(new RoomRateQueryDto(), {
        page: 2,
        limit: 2,
        roomTypeId: ROOM_TYPE_ID,
        fromDate: '2026-09-03',
        toDate: '2026-09-12',
      });
      repository.findPage.mockResolvedValue({
        items: [createRoomRate()],
        totalItems: 5,
      });

      const result = await service.list(dto);

      expect(result).toBeInstanceOf(PaginatedResult);
      expect(result.pagination).toEqual({
        page: 2,
        pageSize: 2,
        totalItems: 5,
        totalPages: 3,
      });
      expect(repository.findPage).toHaveBeenCalledWith({
        page: 2,
        limit: 2,
        roomTypeId: ROOM_TYPE_ID,
        fromDate: '2026-09-03',
        toDate: '2026-09-12',
      });
    });

    it('rejects unpaired or reversed date filters', async () => {
      const unpaired = Object.assign(new RoomRateQueryDto(), { fromDate: '2026-09-03' });
      const reversed = Object.assign(new RoomRateQueryDto(), {
        fromDate: '2026-09-12',
        toDate: '2026-09-03',
      });

      await expect(service.list(unpaired)).rejects.toMatchObject({
        response: { error: 'INVALID_ROOM_RATE_RANGE' },
      });
      await expect(service.list(reversed)).rejects.toMatchObject({
        response: { error: 'INVALID_ROOM_RATE_RANGE' },
      });
      expect(repository.findPage).not.toHaveBeenCalled();
    });

    it('returns past, current, or future rate detail', async () => {
      repository.findById.mockResolvedValue(createRoomRate({ startDate: '2026-08-01' }));

      await expect(service.findOne(ROOM_RATE_ID)).resolves.toMatchObject({
        id: ROOM_RATE_ID,
        startDate: '2026-08-01',
      });
    });

    it('rejects missing rate detail', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(ROOM_RATE_ID)).rejects.toMatchObject({
        response: { error: 'ROOM_RATE_NOT_FOUND' },
      });
    });
  });

  describe('update', () => {
    it('validates the active Room Type and updates the future rate', async () => {
      const existing = createRoomRate();
      const updated = createRoomRate({
        endDate: '2026-09-06',
        pricePerNight: 1400000,
        updatedAt: new Date('2026-08-23T02:00:00.000Z'),
      });
      repository.findById.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      await expect(
        service.update(ROOM_RATE_ID, { endDate: '2026-09-06', pricePerNight: 1400000 }),
      ).resolves.toMatchObject({
        id: ROOM_RATE_ID,
        endDate: '2026-09-06',
        pricePerNight: 1400000,
      });
      expect(roomTypeQuery.findById).toHaveBeenCalledWith(ROOM_TYPE_ID);
      expect(repository.hasOverlap).toHaveBeenCalledWith(
        ROOM_TYPE_ID,
        '2026-09-01',
        '2026-09-06',
        ROOM_RATE_ID,
      );
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: ROOM_RATE_ID,
          endDate: '2026-09-06',
          pricePerNight: 1400000,
        }),
      );
    });

    it('rejects a missing rate', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(ROOM_RATE_ID, { pricePerNight: 1400000 })).rejects.toMatchObject({
        response: { error: 'ROOM_RATE_NOT_FOUND' },
      });
      expect(roomTypeQuery.findById).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects an empty update', async () => {
      await expect(service.update(ROOM_RATE_ID, {})).rejects.toMatchObject({
        response: { error: 'INVALID_ROOM_RATE_UPDATE' },
      });
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('rejects a started rate before Room Type validation or persistence', async () => {
      repository.findById.mockResolvedValue(createRoomRate({ startDate: '2026-08-23' }));

      await expect(service.update(ROOM_RATE_ID, { pricePerNight: 1400000 })).rejects.toMatchObject({
        response: { error: 'ROOM_RATE_ALREADY_STARTED' },
      });
      expect(roomTypeQuery.findById).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects update when the Room Type is inactive', async () => {
      repository.findById.mockResolvedValue(createRoomRate());
      roomTypeQuery.findById.mockResolvedValue({ id: ROOM_TYPE_ID, isActive: false });

      await expect(service.update(ROOM_RATE_ID, { pricePerNight: 1400000 })).rejects.toMatchObject({
        response: { error: 'INACTIVE_ROOM_TYPE' },
      });
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects a range that is invalid after merging the patch', async () => {
      repository.findById.mockResolvedValue(createRoomRate());

      await expect(service.update(ROOM_RATE_ID, { endDate: '2026-08-31' })).rejects.toMatchObject({
        response: { error: 'INVALID_ROOM_RATE_RANGE' },
      });
      expect(repository.hasOverlap).not.toHaveBeenCalled();
    });

    it('rejects an overlapping updated range before saving', async () => {
      repository.findById.mockResolvedValue(createRoomRate());
      repository.hasOverlap.mockResolvedValue(true);

      await expect(service.update(ROOM_RATE_ID, { pricePerNight: 1400000 })).rejects.toMatchObject({
        response: { error: 'ROOM_RATE_OVERLAP' },
      });
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('hard deletes an unstarted rate', async () => {
      const roomRate = createRoomRate();
      repository.findById.mockResolvedValue(roomRate);

      await expect(service.delete(ROOM_RATE_ID)).resolves.toBeUndefined();
      expect(repository.remove).toHaveBeenCalledWith(roomRate);
    });

    it('rejects a missing rate', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(ROOM_RATE_ID)).rejects.toMatchObject({
        response: { error: 'ROOM_RATE_NOT_FOUND' },
      });
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('rejects a rate that has already started', async () => {
      repository.findById.mockResolvedValue(createRoomRate({ startDate: '2026-08-23' }));

      await expect(service.delete(ROOM_RATE_ID)).rejects.toMatchObject({
        response: { error: 'ROOM_RATE_ALREADY_STARTED' },
      });
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});
