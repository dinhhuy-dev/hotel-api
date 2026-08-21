import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { CreateRoomDto } from '../dto/room/create-room.dto';
import { RoomQueryDto } from '../dto/room/room-query.dto';
import { UpdateRoomStatusDto } from '../dto/room/update-room-status.dto';
import { UpdateRoomDto } from '../dto/room/update-room.dto';
import { OperationalStatus } from '../entities/enum/operational-status';
import { Facility } from '../entities/facility.entity';
import { RoomType } from '../entities/room-type.entity';
import { Room } from '../entities/room.entity';
import { RoomRepositoryPort, RoomWithDetails } from '../repositories/ports/room-repository.port';
import { RoomService } from './room.service';

const roomId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const roomTypeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function createRoom(overrides: Partial<Room> = {}): Room {
  return Object.assign(new Room(), {
    id: roomId,
    roomNumber: 'A-101',
    floor: 'A',
    roomTypeId,
    operationalStatus: OperationalStatus.OutOfService,
    createdAt: new Date('2026-08-20T01:00:00.000Z'),
    updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    ...overrides,
  });
}

function createRoomType(overrides: Partial<RoomType> = {}): RoomType {
  return Object.assign(new RoomType(), {
    id: roomTypeId,
    code: 'DELUXE_KING',
    name: 'Deluxe King',
    description: 'A spacious room.',
    maxOccupancy: 2,
    bedConfiguration: 'One king bed',
    displayOrder: 10,
    isActive: true,
    createdAt: new Date('2026-08-20T01:00:00.000Z'),
    updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    ...overrides,
  });
}

function createFacility(overrides: Partial<Facility> = {}): Facility {
  return Object.assign(new Facility(), {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'Free Wi-Fi',
    description: 'Fast wireless internet.',
    isActive: true,
    createdAt: new Date('2026-08-20T01:00:00.000Z'),
    updatedAt: new Date('2026-08-20T01:00:00.000Z'),
    ...overrides,
  });
}

function createDetails(overrides: Partial<RoomWithDetails> = {}): RoomWithDetails {
  return {
    room: createRoom(),
    roomType: createRoomType(),
    facilities: [createFacility()],
    ...overrides,
  };
}

describe('RoomService', () => {
  let service: RoomService;
  let repository: jest.Mocked<
    Pick<
      RoomRepositoryPort,
      | 'findByRoomNumber'
      | 'findAllWithDetails'
      | 'findAllNonRetiredWithDetails'
      | 'findWithDetailsById'
      | 'create'
      | 'update'
      | 'updateStatus'
      | 'retire'
      | 'restore'
    >
  >;

  beforeEach(() => {
    repository = {
      findByRoomNumber: jest.fn(),
      findAllWithDetails: jest.fn(),
      findAllNonRetiredWithDetails: jest.fn(),
      findWithDetailsById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      retire: jest.fn(),
      restore: jest.fn(),
    };

    service = new RoomService(repository);
  });

  it('creates an out-of-service room with complete management details', async () => {
    const dto: CreateRoomDto = {
      roomNumber: 'A-101',
      floor: 'A',
      roomTypeId,
    };
    const details = createDetails();

    repository.findByRoomNumber.mockResolvedValue(null);
    repository.create.mockResolvedValue({ kind: 'created', details });

    await expect(service.create(dto)).resolves.toEqual({
      id: roomId,
      roomNumber: 'A-101',
      floor: 'A',
      operationalStatus: OperationalStatus.OutOfService,
      roomType: {
        id: roomTypeId,
        code: 'DELUXE_KING',
        name: 'Deluxe King',
        description: 'A spacious room.',
        maxOccupancy: 2,
        bedConfiguration: 'One king bed',
        displayOrder: 10,
        isActive: true,
        createdAt: '2026-08-20T01:00:00.000Z',
        updatedAt: '2026-08-20T01:00:00.000Z',
        facilities: [
          {
            id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            name: 'Free Wi-Fi',
            description: 'Fast wireless internet.',
            isActive: true,
            createdAt: '2026-08-20T01:00:00.000Z',
            updatedAt: '2026-08-20T01:00:00.000Z',
          },
        ],
      },
      createdAt: '2026-08-20T01:00:00.000Z',
      updatedAt: '2026-08-20T01:00:00.000Z',
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        roomTypeId,
        operationalStatus: OperationalStatus.OutOfService,
      }),
    );
  });

  it('rejects a duplicate room number before creating a room', async () => {
    repository.findByRoomNumber.mockResolvedValue(createRoom());

    await expect(
      service.create({ roomNumber: 'A-101', floor: 'A', roomTypeId }),
    ).rejects.toMatchObject({
      response: {
        message: 'Room number already exists.',
        error: 'DUPLICATE_ROOM_NUMBER',
      },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('maps missing and inactive room type results while creating a room', async () => {
    repository.findByRoomNumber.mockResolvedValue(null);
    repository.create.mockResolvedValue({ kind: 'room-type-not-found' });

    await expect(
      service.create({ roomNumber: 'A-101', floor: 'A', roomTypeId }),
    ).rejects.toMatchObject({
      response: {
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      },
    });

    repository.create.mockResolvedValue({ kind: 'inactive-room-type' });

    await expect(
      service.create({ roomNumber: 'A-101', floor: 'A', roomTypeId }),
    ).rejects.toMatchObject({
      response: {
        message: 'Room type is inactive.',
        error: 'INACTIVE_ROOM_TYPE',
      },
    });
  });

  it('returns a PaginatedResult for management room lists', async () => {
    const details = createDetails();
    const dto: RoomQueryDto = {
      page: 2,
      limit: 5,
      search: 'A-10',
      roomTypeId,
      floor: 'A',
      operationalStatus: OperationalStatus.OutOfService,
    };

    repository.findAllWithDetails.mockResolvedValue({
      items: [details],
      totalItems: 6,
    });

    const result = await service.list(dto);

    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 5,
      totalItems: 6,
      totalPages: 2,
    });
    expect(repository.findAllWithDetails).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: 'A-10',
      roomTypeId,
      floor: 'A',
      operationalStatus: OperationalStatus.OutOfService,
    });
  });

  it('returns a restricted staff response and always excludes retired rooms from staff lists', async () => {
    const details = createDetails();

    repository.findAllNonRetiredWithDetails.mockResolvedValue({
      items: [details],
      totalItems: 1,
    });

    const result = await service.listForStaff({
      page: 1,
      limit: 10,
    });

    expect(result.items).toEqual([
      {
        id: roomId,
        roomNumber: 'A-101',
        floor: 'A',
        operationalStatus: OperationalStatus.OutOfService,
        roomType: {
          id: roomTypeId,
          code: 'DELUXE_KING',
          name: 'Deluxe King',
          maxOccupancy: 2,
          bedConfiguration: 'One king bed',
          facilities: [
            {
              id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
              name: 'Free Wi-Fi',
              description: 'Fast wireless internet.',
            },
          ],
        },
      },
    ]);
    expect(repository.findAllNonRetiredWithDetails).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: undefined,
      roomTypeId: undefined,
      floor: undefined,
      operationalStatus: undefined,
    });
  });

  it('hides retired rooms from staff detail requests', async () => {
    repository.findWithDetailsById.mockResolvedValue(
      createDetails({ room: createRoom({ operationalStatus: OperationalStatus.Retired }) }),
    );

    await expect(service.findOneForStaff(roomId)).rejects.toMatchObject({
      response: {
        message: 'Room not found.',
        error: 'ROOM_NOT_FOUND',
      },
    });
  });

  it('returns a management room detail including retired rooms', async () => {
    repository.findWithDetailsById.mockResolvedValue(
      createDetails({ room: createRoom({ operationalStatus: OperationalStatus.Retired }) }),
    );

    await expect(service.findOne(roomId)).resolves.toMatchObject({
      id: roomId,
      operationalStatus: OperationalStatus.Retired,
    });
  });

  it('rejects duplicate room number metadata updates before calling the adapter', async () => {
    repository.findByRoomNumber.mockResolvedValue(
      createRoom({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }),
    );

    await expect(service.update(roomId, { roomNumber: 'A-102' })).rejects.toMatchObject({
      response: {
        message: 'Room number already exists.',
        error: 'DUPLICATE_ROOM_NUMBER',
      },
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects null metadata updates before checking or writing the room', async () => {
    await expect(
      service.update(roomId, { roomNumber: null } as unknown as UpdateRoomDto),
    ).rejects.toMatchObject({
      response: {
        message: 'Room update fields cannot be null.',
        error: 'INVALID_ROOM_UPDATE',
      },
    });
    expect(repository.findByRoomNumber).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('maps room type change restrictions from metadata updates', async () => {
    repository.findByRoomNumber.mockResolvedValue(null);
    repository.update.mockResolvedValue({ kind: 'room-type-change-not-allowed' });

    await expect(service.update(roomId, { roomTypeId })).rejects.toMatchObject({
      response: {
        message: 'Room type can only be changed while the room is out of service.',
        error: 'ROOM_TYPE_CHANGE_NOT_ALLOWED',
      },
    });
  });

  it('delegates same-state status updates and maps the room response', async () => {
    const details = createDetails({
      room: createRoom({ operationalStatus: OperationalStatus.Ready }),
    });
    const dto: UpdateRoomStatusDto = { operationalStatus: OperationalStatus.Ready };

    repository.updateStatus.mockResolvedValue({ kind: 'updated', details });

    await expect(service.updateStatus(roomId, dto)).resolves.toMatchObject({
      id: roomId,
      operationalStatus: OperationalStatus.Ready,
    });
    expect(repository.updateStatus).toHaveBeenCalledWith(roomId, OperationalStatus.Ready);
  });

  it('rejects retired and invalid operational status transitions', async () => {
    await expect(
      service.updateStatus(roomId, { operationalStatus: OperationalStatus.Retired }),
    ).rejects.toMatchObject({
      response: {
        message: 'Invalid room operational status transition.',
        error: 'INVALID_ROOM_STATUS_TRANSITION',
      },
    });
    expect(repository.updateStatus).not.toHaveBeenCalled();

    repository.updateStatus.mockResolvedValue({ kind: 'invalid-transition' });

    await expect(
      service.updateStatus(roomId, { operationalStatus: OperationalStatus.Cleaning }),
    ).rejects.toMatchObject({
      response: {
        message: 'Invalid room operational status transition.',
        error: 'INVALID_ROOM_STATUS_TRANSITION',
      },
    });
  });

  it('retires a room through the repository operation', async () => {
    const details = createDetails({
      room: createRoom({ operationalStatus: OperationalStatus.Retired }),
    });

    repository.retire.mockResolvedValue({ kind: 'retired', details });

    await expect(service.retire(roomId)).resolves.toMatchObject({
      id: roomId,
      operationalStatus: OperationalStatus.Retired,
    });
    expect(repository.retire).toHaveBeenCalledWith(roomId);
  });

  it('maps restore lifecycle restrictions', async () => {
    repository.restore.mockResolvedValue({ kind: 'room-not-retired' });

    await expect(service.restore(roomId)).rejects.toMatchObject({
      response: {
        message: 'Room is not retired.',
        error: 'ROOM_NOT_RETIRED',
      },
    });

    repository.restore.mockResolvedValue({ kind: 'inactive-room-type' });

    await expect(service.restore(roomId)).rejects.toMatchObject({
      response: {
        message: 'Room type is inactive.',
        error: 'INACTIVE_ROOM_TYPE',
      },
    });
  });

  it('updates metadata through the adapter when the room number belongs to the room', async () => {
    const details = createDetails({ room: createRoom({ floor: 'B' }) });
    const dto: UpdateRoomDto = { roomNumber: 'A-101', floor: 'B' };

    repository.findByRoomNumber.mockResolvedValue(createRoom());
    repository.update.mockResolvedValue({ kind: 'updated', details });

    await expect(service.update(roomId, dto)).resolves.toMatchObject({
      id: roomId,
      floor: 'B',
    });
    expect(repository.update).toHaveBeenCalledWith(roomId, {
      roomNumber: 'A-101',
      floor: 'B',
    });
  });
});
