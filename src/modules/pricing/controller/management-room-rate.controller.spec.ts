import { PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { CreateRoomRateDto } from '../dto/create-room-rate.dto';
import { RoomRateQueryDto } from '../dto/room-rate-query.dto';
import { RoomRateResponseDto } from '../dto/room-rate-response.dto';
import { UpdateRoomRateDto } from '../dto/update-room-rate.dto';
import { RoomRateService } from '../services/room-rate.service';
import { ManagementRoomRateController } from './management-room-rate.controller';

const apiResponseMetadataKey = 'swagger/apiResponse';

function responseStatuses(handlerName: keyof ManagementRoomRateController): number[] {
  const handler: unknown = Object.getOwnPropertyDescriptor(
    ManagementRoomRateController.prototype,
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

function createResponse(overrides: Partial<RoomRateResponseDto> = {}): RoomRateResponseDto {
  return {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    roomTypeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    pricePerNight: 1250000,
    createdAt: '2026-08-23T01:00:00.000Z',
    updatedAt: '2026-08-23T01:00:00.000Z',
    ...overrides,
  };
}

describe('ManagementRoomRateController', () => {
  let controller: ManagementRoomRateController;
  let service: jest.Mocked<
    Pick<RoomRateService, 'create' | 'list' | 'findOne' | 'update' | 'delete'>
  >;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    controller = new ManagementRoomRateController(service as unknown as RoomRateService);
  });

  it('uses the approved route and management roles', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ManagementRoomRateController)).toBe(
      'v1/pricing/management/room-rates',
    );
    expect(Reflect.getMetadata(ROLES_KEY, ManagementRoomRateController)).toEqual([
      AccountRole.ADMINISTRATOR,
      AccountRole.HOTEL_MANAGER,
    ]);
  });

  it('documents success and operation-specific error responses', () => {
    expect(responseStatuses('create')).toEqual([201, 400, 404, 409]);
    expect(responseStatuses('list')).toEqual([200, 400]);
    expect(responseStatuses('findOne')).toEqual([200, 400, 404]);
    expect(responseStatuses('update')).toEqual([200, 400, 404, 409]);
    expect(responseStatuses('delete')).toEqual([200, 400, 404, 409]);
  });

  it('delegates creation to the service', async () => {
    const dto: CreateRoomRateDto = {
      roomTypeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      startDate: '2026-09-01',
      endDate: '2026-09-05',
      pricePerNight: 1250000,
    };
    const response = createResponse();
    service.create.mockResolvedValue(response);

    await expect(controller.create(dto)).resolves.toBe(response);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates paginated overlap filters to the service', async () => {
    const dto = Object.assign(new RoomRateQueryDto(), {
      fromDate: '2026-09-03',
      toDate: '2026-09-12',
    });
    const response = new PaginatedResult([createResponse()], {
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
    service.list.mockResolvedValue(response);

    await expect(controller.list(dto)).resolves.toBe(response);
    expect(service.list).toHaveBeenCalledWith(dto);
  });

  it('delegates detail lookup to the service', async () => {
    const response = createResponse();
    service.findOne.mockResolvedValue(response);

    await expect(controller.findOne(response.id)).resolves.toBe(response);
    expect(service.findOne).toHaveBeenCalledWith(response.id);
  });

  it('delegates update without allowing Room Type changes', async () => {
    const response = createResponse({ pricePerNight: 1400000 });
    const dto: UpdateRoomRateDto = { pricePerNight: 1400000 };
    service.update.mockResolvedValue(response);

    await expect(controller.update(response.id, dto)).resolves.toBe(response);
    expect(service.update).toHaveBeenCalledWith(response.id, dto);
  });

  it('delegates hard deletion and returns no business object', async () => {
    service.delete.mockResolvedValue(undefined);

    await expect(
      controller.delete('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    ).resolves.toBeUndefined();
    expect(service.delete).toHaveBeenCalledWith('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });
});
