import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { CreateRoomTypeDto } from '../dto/room-type/create-room-type.dto';
import { Facility } from '../entities/facility.entity';
import { RoomType } from '../entities/room-type.entity';
import { RoomTypeRepositoryPort } from '../repositories/ports/room-type-repository.port';
import { RoomTypeService } from './room-type.service';
import { UpdateRoomTypeDto } from '../dto/room-type/update-room-type.dto';
import { RoomTypeFacilityIdsDto } from '../dto/room-type/room-type-facility-ids.dto';

function createRoomType(overrides: Partial<RoomType> = {}): RoomType {
  return Object.assign(new RoomType(), {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    code: 'DELUXE_KING',
    name: 'Deluxe King',
    description: null,
    maxOccupancy: 2,
    bedConfiguration: null,
    displayOrder: 10,
    isActive: true,
    createdAt: new Date('2026-08-20T01:00:00.000Z'),
    updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    ...overrides,
  });
}

function createFacility(overrides: Partial<Facility> = {}): Facility {
  return Object.assign(new Facility(), {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Free Wi-Fi',
    description: null,
    isActive: true,
    createdAt: new Date('2026-08-20T01:00:00.000Z'),
    updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    ...overrides,
  });
}

describe('RoomTypeService', () => {
  let service: RoomTypeService;
  let repository: jest.Mocked<
    Pick<
      RoomTypeRepositoryPort,
      | 'createWithFacilities'
      | 'findAllWithFacilities'
      | 'findWithFacilitiesById'
      | 'findActivePage'
      | 'findActiveWithActiveFacilitiesById'
      | 'save'
      | 'deactivate'
      | 'restore'
      | 'addFacilities'
      | 'removeFacilities'
    >
  >;

  const dto: CreateRoomTypeDto = {
    code: 'DELUXE_KING',
    name: 'Deluxe King',
    maxOccupancy: 2,
    displayOrder: 10,
    facilityIds: ['11111111-1111-4111-8111-111111111111'],
  };

  beforeEach(() => {
    repository = {
      createWithFacilities: jest.fn(),
      findAllWithFacilities: jest.fn(),
      findWithFacilitiesById: jest.fn(),
      findActivePage: jest.fn(),
      findActiveWithActiveFacilitiesById: jest.fn(),
      save: jest.fn(),
      deactivate: jest.fn(),
      restore: jest.fn(),
      addFacilities: jest.fn(),
      removeFacilities: jest.fn(),
    };

    service = new RoomTypeService(repository as unknown as RoomTypeRepositoryPort);
  });

  it('creates and maps a room type with facilities', async () => {
    const roomType = Object.assign(new RoomType(), {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      code: dto.code,
      name: dto.name,
      description: null,
      maxOccupancy: dto.maxOccupancy,
      bedConfiguration: null,
      displayOrder: dto.displayOrder,
      isActive: true,
      createdAt: new Date('2026-08-20T01:00:00.000Z'),
      updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    });
    const facility = Object.assign(new Facility(), {
      id: dto.facilityIds![0],
      name: 'Free Wi-Fi',
      description: null,
      isActive: true,
      createdAt: new Date('2026-08-20T01:00:00.000Z'),
      updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    });

    repository.createWithFacilities.mockResolvedValue({
      kind: 'created',
      roomType,
      facilities: [facility],
    });

    await expect(service.create(dto)).resolves.toEqual({
      id: roomType.id,
      code: roomType.code,
      name: roomType.name,
      description: null,
      maxOccupancy: 2,
      bedConfiguration: null,
      displayOrder: 10,
      isActive: true,
      createdAt: '2026-08-20T01:00:00.000Z',
      updatedAt: '2026-08-20T01:00:00.000Z',
      facilities: [
        {
          id: facility.id,
          name: 'Free Wi-Fi',
          description: null,
          isActive: true,
          createdAt: '2026-08-20T01:00:00.000Z',
          updatedAt: '2026-08-20T01:00:00.000Z',
        },
      ],
    });

    expect(repository.createWithFacilities).toHaveBeenCalledWith({
      roomType: expect.objectContaining({
        code: 'DELUXE_KING',
        description: null,
        bedConfiguration: null,
        isActive: true,
      }) as unknown,
      facilityIds: dto.facilityIds,
    });
  });

  it('rejects a duplicate room type code', async () => {
    repository.createWithFacilities.mockResolvedValue({ kind: 'duplicate-code' });

    await expect(service.create(dto)).rejects.toMatchObject({
      response: {
        message: 'Room type code already exists.',
        error: 'DUPLICATE_ROOM_TYPE_CODE',
      },
    });
  });

  it('returns both missing and inactive facility ID lists', async () => {
    repository.createWithFacilities.mockResolvedValue({
      kind: 'invalid-facilities',
      missingFacilityIds: ['missing-facility-id'],
      inactiveFacilityIds: ['inactive-facility-id'],
    });

    await expect(service.create(dto)).rejects.toMatchObject({
      response: {
        message: [
          'Facilities not found: missing-facility-id.',
          'Inactive facilities: inactive-facility-id.',
        ],
        error: 'INVALID_FACILITIES',
      },
    });
  });

  it('returns a PaginatedResult for management room type lists', async () => {
    const roomType = Object.assign(new RoomType(), {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      code: 'DELUXE_KING',
      name: 'Deluxe King',
      description: null,
      maxOccupancy: 2,
      bedConfiguration: null,
      displayOrder: 10,
      isActive: true,
      createdAt: new Date('2026-08-20T01:00:00.000Z'),
      updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    });

    repository.findAllWithFacilities.mockResolvedValue({
      items: [{ roomType, facilities: [] }],
      totalItems: 3,
    });

    const result = await service.list({
      page: 2,
      limit: 2,
      search: 'deluxe',
      isActive: true,
    });

    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.items).toHaveLength(1);
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
    });
    expect(repository.findAllWithFacilities).toHaveBeenCalledWith({
      page: 2,
      limit: 2,
      search: 'deluxe',
      isActive: true,
    });
  });

  it('returns a paginated public list without lifecycle fields', async () => {
    const roomType = createRoomType({
      description: 'A spacious room.',
      bedConfiguration: 'One king bed',
    });

    repository.findActivePage.mockResolvedValue({
      items: [roomType],
      totalItems: 3,
    });

    const result = await service.listPublic({
      page: 2,
      limit: 2,
      search: 'deluxe',
    });

    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.items).toEqual([
      {
        id: roomType.id,
        code: roomType.code,
        name: roomType.name,
        maxOccupancy: roomType.maxOccupancy,
        bedConfiguration: roomType.bedConfiguration,
        displayOrder: roomType.displayOrder,
      },
    ]);
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
    });
    expect(repository.findActivePage).toHaveBeenCalledWith({
      page: 2,
      limit: 2,
      search: 'deluxe',
    });
  });

  it('returns a public detail with active facilities and no lifecycle fields', async () => {
    const roomType = createRoomType({
      description: 'A spacious room.',
      bedConfiguration: 'One king bed',
    });
    const facility = createFacility({ description: 'Fast wireless internet.' });

    repository.findActiveWithActiveFacilitiesById.mockResolvedValue({
      roomType,
      facilities: [facility],
    });

    await expect(service.findPublicOne(roomType.id)).resolves.toEqual({
      id: roomType.id,
      code: roomType.code,
      name: roomType.name,
      description: roomType.description,
      maxOccupancy: roomType.maxOccupancy,
      bedConfiguration: roomType.bedConfiguration,
      displayOrder: roomType.displayOrder,
      facilities: [
        {
          id: facility.id,
          name: facility.name,
          description: facility.description,
        },
      ],
    });

    expect(repository.findActiveWithActiveFacilitiesById).toHaveBeenCalledWith(roomType.id);
  });

  it('hides inactive or missing public room types as not found', async () => {
    repository.findActiveWithActiveFacilitiesById.mockResolvedValue(null);

    await expect(
      service.findPublicOne('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    ).rejects.toMatchObject({
      response: {
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      },
    });
  });

  it('rejects a missing management room type', async () => {
    repository.findWithFacilitiesById.mockResolvedValue(null);

    await expect(service.findOne('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).rejects.toMatchObject({
      response: {
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      },
    });
  });

  it('updates mutable room type fields and preserves code and facilities', async () => {
    const roomType = Object.assign(new RoomType(), {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      code: 'DELUXE_KING',
      name: 'Deluxe King',
      description: 'Original description.',
      maxOccupancy: 2,
      bedConfiguration: 'One king bed',
      displayOrder: 10,
      isActive: true,
      createdAt: new Date('2026-08-20T01:00:00.000Z'),
      updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    });

    const facility = Object.assign(new Facility(), {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Free Wi-Fi',
      description: null,
      isActive: true,
      createdAt: new Date('2026-08-20T01:00:00.000Z'),
      updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    });

    const updateDto: UpdateRoomTypeDto = {
      name: 'Premier King',
      maxOccupancy: 3,
      displayOrder: 20,
    };

    repository.findWithFacilitiesById.mockResolvedValue({
      roomType,
      facilities: [facility],
    });
    repository.save.mockResolvedValue(roomType);

    await expect(service.update(roomType.id, updateDto)).resolves.toMatchObject({
      id: roomType.id,
      code: 'DELUXE_KING',
      name: 'Premier King',
      description: 'Original description.',
      maxOccupancy: 3,
      bedConfiguration: 'One king bed',
      displayOrder: 20,
      facilities: [{ id: facility.id, name: 'Free Wi-Fi' }],
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'DELUXE_KING',
        name: 'Premier King',
        maxOccupancy: 3,
        displayOrder: 20,
      }),
    );
  });

  it('allows clearing nullable room type fields', async () => {
    const roomType = Object.assign(new RoomType(), {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      code: 'DELUXE_KING',
      name: 'Deluxe King',
      description: 'Original description.',
      maxOccupancy: 2,
      bedConfiguration: 'One king bed',
      displayOrder: 10,
      isActive: true,
      createdAt: new Date('2026-08-20T01:00:00.000Z'),
      updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    });

    repository.findWithFacilitiesById.mockResolvedValue({
      roomType,
      facilities: [],
    });
    repository.save.mockResolvedValue(roomType);

    await expect(
      service.update(roomType.id, {
        description: null,
        bedConfiguration: null,
      }),
    ).resolves.toMatchObject({
      description: null,
      bedConfiguration: null,
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
        bedConfiguration: null,
      }),
    );
  });

  it('returns ROOM_TYPE_NOT_FOUND without saving when updating a missing room type', async () => {
    repository.findWithFacilitiesById.mockResolvedValue(null);

    await expect(
      service.update('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', {
        name: 'Premier King',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      },
    });

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('deactivates a room type that has no non-retired rooms', async () => {
    const roomType = createRoomType({ isActive: false });
    const facility = createFacility();

    repository.deactivate.mockResolvedValue({
      kind: 'deactivated',
      roomType,
      facilities: [facility],
    });

    await expect(service.deactivate(roomType.id)).resolves.toMatchObject({
      id: roomType.id,
      isActive: false,
      facilities: [{ id: facility.id, name: facility.name }],
    });

    expect(repository.deactivate).toHaveBeenCalledWith(roomType.id);
  });

  it('returns ROOM_TYPE_NOT_FOUND when deactivating a missing room type', async () => {
    repository.deactivate.mockResolvedValue({ kind: 'not-found' });

    await expect(service.deactivate('missing-room-type-id')).rejects.toMatchObject({
      response: {
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      },
    });
  });

  it('returns ROOM_TYPE_IN_USE when a non-retired room uses the room type', async () => {
    repository.deactivate.mockResolvedValue({ kind: 'in-use' });

    await expect(service.deactivate('room-type-id')).rejects.toMatchObject({
      response: {
        message: 'Room type is assigned to a non-retired room.',
        error: 'ROOM_TYPE_IN_USE',
      },
    });
  });
  it('restores a room type when all assigned facilities are active', async () => {
    const roomType = createRoomType({ isActive: true });
    const facility = createFacility();

    repository.restore.mockResolvedValue({
      kind: 'restored',
      roomType,
      facilities: [facility],
    });

    await expect(service.restore(roomType.id)).resolves.toMatchObject({
      id: roomType.id,
      isActive: true,
      facilities: [{ id: facility.id, name: facility.name }],
    });

    expect(repository.restore).toHaveBeenCalledWith(roomType.id);
  });

  it('returns ROOM_TYPE_NOT_FOUND when restoring a missing room type', async () => {
    repository.restore.mockResolvedValue({ kind: 'not-found' });

    await expect(service.restore('missing-room-type-id')).rejects.toMatchObject({
      response: {
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      },
    });
  });

  it('returns INACTIVE_FACILITY when restoring with inactive assigned facilities', async () => {
    repository.restore.mockResolvedValue({
      kind: 'inactive-facilities',
      inactiveFacilityIds: [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ],
    });

    await expect(service.restore('room-type-id')).rejects.toMatchObject({
      response: {
        message:
          'Inactive facilities: 11111111-1111-4111-8111-111111111111, 22222222-2222-4222-8222-222222222222.',
        error: 'INACTIVE_FACILITY',
      },
    });
  });

  it('adds facilities and returns the updated room type', async () => {
    const roomType = createRoomType();
    const facility = createFacility();
    const dto: RoomTypeFacilityIdsDto = {
      facilityIds: [facility.id],
    };

    repository.addFacilities.mockResolvedValue({
      kind: 'changed',
      roomType,
      facilities: [facility],
    });

    await expect(service.addFacilities(roomType.id, dto)).resolves.toMatchObject({
      id: roomType.id,
      facilities: [{ id: facility.id, name: facility.name }],
    });

    expect(repository.addFacilities).toHaveBeenCalledWith({
      roomTypeId: roomType.id,
      facilityIds: dto.facilityIds,
    });
  });

  it('returns INVALID_FACILITIES when adding missing or inactive facilities', async () => {
    repository.addFacilities.mockResolvedValue({
      kind: 'invalid-facilities',
      missingFacilityIds: ['missing-facility-id'],
      inactiveFacilityIds: ['inactive-facility-id'],
    });

    await expect(
      service.addFacilities('room-type-id', {
        facilityIds: ['11111111-1111-4111-8111-111111111111'],
      }),
    ).rejects.toMatchObject({
      response: {
        message: [
          'Facilities not found: missing-facility-id.',
          'Inactive facilities: inactive-facility-id.',
        ],
        error: 'INVALID_FACILITIES',
      },
    });
  });

  it('returns ROOM_TYPE_NOT_FOUND when adding facilities to a missing room type', async () => {
    repository.addFacilities.mockResolvedValue({ kind: 'not-found' });

    await expect(
      service.addFacilities('missing-room-type-id', {
        facilityIds: ['11111111-1111-4111-8111-111111111111'],
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      },
    });
  });

  it('removes facilities and returns the updated room type', async () => {
    const roomType = createRoomType();
    const dto: RoomTypeFacilityIdsDto = {
      facilityIds: ['11111111-1111-4111-8111-111111111111'],
    };

    repository.removeFacilities.mockResolvedValue({
      kind: 'changed',
      roomType,
      facilities: [],
    });

    await expect(service.removeFacilities(roomType.id, dto)).resolves.toMatchObject({
      id: roomType.id,
      facilities: [],
    });

    expect(repository.removeFacilities).toHaveBeenCalledWith({
      roomTypeId: roomType.id,
      facilityIds: dto.facilityIds,
    });
  });

  it('returns ROOM_TYPE_NOT_FOUND when removing facilities from a missing room type', async () => {
    repository.removeFacilities.mockResolvedValue({ kind: 'not-found' });

    await expect(
      service.removeFacilities('missing-room-type-id', {
        facilityIds: ['11111111-1111-4111-8111-111111111111'],
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      },
    });
  });
});
