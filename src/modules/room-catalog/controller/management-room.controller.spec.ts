import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { CreateRoomDto } from '../dto/room/create-room.dto';
import { RoomQueryDto } from '../dto/room/room-query.dto';
import { RoomResponseDto } from '../dto/room/room-response.dto';
import { UpdateRoomStatusDto } from '../dto/room/update-room-status.dto';
import { UpdateRoomDto } from '../dto/room/update-room.dto';
import { OperationalStatus } from '../entities/enum/operational-status';
import { RoomService } from '../services/room.service';
import { ManagementRoomController } from './management-room.controller';

const apiResponseMetadataKey = 'swagger/apiResponse';

function responseStatuses(handlerName: keyof ManagementRoomController): number[] {
  const handler: unknown = Object.getOwnPropertyDescriptor(
    ManagementRoomController.prototype,
    handlerName,
  )?.value;

  if (typeof handler !== 'function') {
    throw new Error(`Expected ${handlerName} handler to exist.`);
  }

  const responses: unknown = Reflect.getMetadata(apiResponseMetadataKey, handler);

  if (typeof responses !== 'object' || responses === null || Array.isArray(responses)) {
    throw new Error(`Expected ${handlerName} handler to document API responses.`);
  }

  return Object.keys(responses)
    .map(Number)
    .sort((left, right) => left - right);
}

function createResponse(overrides: Partial<RoomResponseDto> = {}): RoomResponseDto {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    roomNumber: 'A-101',
    floor: 'A',
    operationalStatus: OperationalStatus.OutOfService,
    roomType: {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      code: 'DELUXE_KING',
      name: 'Deluxe King',
      description: null,
      maxOccupancy: 2,
      bedConfiguration: 'One king bed',
      displayOrder: 10,
      isActive: true,
      createdAt: '2026-08-20T01:00:00.000Z',
      updatedAt: '2026-08-20T01:00:00.000Z',
      facilities: [],
    },
    createdAt: '2026-08-20T01:00:00.000Z',
    updatedAt: '2026-08-20T01:00:00.000Z',
    ...overrides,
  };
}

describe('ManagementRoomController', () => {
  let controller: ManagementRoomController;
  let service: jest.Mocked<
    Pick<
      RoomService,
      'create' | 'list' | 'findOne' | 'update' | 'updateStatus' | 'retire' | 'restore'
    >
  >;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      retire: jest.fn(),
      restore: jest.fn(),
    };

    controller = new ManagementRoomController(service as unknown as RoomService);
  });

  it('requires Administrator or Hotel Manager roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ManagementRoomController)).toEqual([
      AccountRole.ADMINISTRATOR,
      AccountRole.HOTEL_MANAGER,
    ]);
  });

  it('documents success and authorization-relevant errors for every management route', () => {
    expect(responseStatuses('list')).toEqual([200, 400]);
    expect(responseStatuses('findOne')).toEqual([200, 400, 404]);
    expect(responseStatuses('create')).toEqual([201, 400, 404, 409]);
    expect(responseStatuses('update')).toEqual([200, 400, 404, 409]);
    expect(responseStatuses('updateStatus')).toEqual([200, 400, 404, 422]);
    expect(responseStatuses('retire')).toEqual([200, 400, 404]);
    expect(responseStatuses('restore')).toEqual([200, 400, 404, 409]);
  });

  it('delegates room creation and list queries to the service', async () => {
    const createDto: CreateRoomDto = {
      roomNumber: 'A-101',
      floor: 'A',
      roomTypeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    };
    const queryDto: RoomQueryDto = {
      page: 2,
      limit: 5,
    };
    const response = createResponse();
    const listResponse = new PaginatedResult([response], {
      page: 2,
      pageSize: 5,
      totalItems: 6,
      totalPages: 2,
    });

    service.create.mockResolvedValue(response);
    service.list.mockResolvedValue(listResponse);

    await expect(controller.create(createDto)).resolves.toBe(response);
    await expect(controller.list(queryDto)).resolves.toBe(listResponse);
    expect(service.create).toHaveBeenCalledWith(createDto);
    expect(service.list).toHaveBeenCalledWith(queryDto);
  });

  it('delegates room detail and metadata updates to the service', async () => {
    const response = createResponse({ floor: 'B' });
    const dto: UpdateRoomDto = {
      floor: 'B',
    };

    service.findOne.mockResolvedValue(response);
    service.update.mockResolvedValue(response);

    await expect(controller.findOne(response.id)).resolves.toBe(response);
    await expect(controller.update(response.id, dto)).resolves.toBe(response);
    expect(service.findOne).toHaveBeenCalledWith(response.id);
    expect(service.update).toHaveBeenCalledWith(response.id, dto);
  });

  it('delegates status and lifecycle operations to the service', async () => {
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const statusDto: UpdateRoomStatusDto = {
      operationalStatus: OperationalStatus.Dirty,
    };
    const statusResponse = createResponse({ operationalStatus: OperationalStatus.Dirty });
    const retiredResponse = createResponse({ operationalStatus: OperationalStatus.Retired });
    const restoredResponse = createResponse({ operationalStatus: OperationalStatus.OutOfService });

    service.updateStatus.mockResolvedValue(statusResponse);
    service.retire.mockResolvedValue(retiredResponse);
    service.restore.mockResolvedValue(restoredResponse);

    await expect(controller.updateStatus(id, statusDto)).resolves.toBe(statusResponse);
    await expect(controller.retire(id)).resolves.toBe(retiredResponse);
    await expect(controller.restore(id)).resolves.toBe(restoredResponse);
    expect(service.updateStatus).toHaveBeenCalledWith(id, statusDto);
    expect(service.retire).toHaveBeenCalledWith(id);
    expect(service.restore).toHaveBeenCalledWith(id);
  });
});
