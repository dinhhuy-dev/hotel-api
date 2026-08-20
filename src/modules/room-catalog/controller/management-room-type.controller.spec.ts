import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { RoomTypeService } from '../services/room-type.service';
import { ManagementRoomTypeController } from './management-room-type.controller';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { CreateRoomTypeDto } from '../dto/room-type/create-room-type.dto';
import { RoomTypeResponseDto } from '../dto/room-type/room-type-response.dto';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { RoomTypeQueryDto } from '../dto/room-type/room-type-query.dto';
import { UpdateRoomTypeDto } from '../dto/room-type/update-room-type.dto';
import { RoomTypeFacilityIdsDto } from '../dto/room-type/room-type-facility-ids.dto';

const apiResponseMetadataKey = 'swagger/apiResponse';

function responseStatuses(handlerName: keyof ManagementRoomTypeController): number[] {
  const handler: unknown = Object.getOwnPropertyDescriptor(
    ManagementRoomTypeController.prototype,
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

function createResponse(overrides: Partial<RoomTypeResponseDto> = {}): RoomTypeResponseDto {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    code: 'DELUXE_KING',
    name: 'Deluxe King',
    description: null,
    maxOccupancy: 2,
    bedConfiguration: null,
    displayOrder: 10,
    isActive: true,
    createdAt: '2026-08-20T01:00:00.000Z',
    updatedAt: '2026-08-20T01:00:00.000Z',
    facilities: [],
    ...overrides,
  };
}

describe('ManagementRoomTypeController', () => {
  let controller: ManagementRoomTypeController;
  let service: jest.Mocked<
    Pick<
      RoomTypeService,
      | 'create'
      | 'list'
      | 'findOne'
      | 'update'
      | 'deactivate'
      | 'restore'
      | 'addFacilities'
      | 'removeFacilities'
    >
  >;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      restore: jest.fn(),
      addFacilities: jest.fn(),
      removeFacilities: jest.fn(),
    };

    controller = new ManagementRoomTypeController(service as unknown as RoomTypeService);
  });

  it('requires Administrator or Hotel Manager roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ManagementRoomTypeController)).toEqual([
      AccountRole.ADMINISTRATOR,
      AccountRole.HOTEL_MANAGER,
    ]);
  });

  it('documents success and authorization-relevant errors for every management route', () => {
    expect(responseStatuses('list')).toEqual([200, 400]);
    expect(responseStatuses('findOne')).toEqual([200, 400, 404]);
    expect(responseStatuses('create')).toEqual([201, 400, 409]);
    expect(responseStatuses('update')).toEqual([200, 400, 404]);
    expect(responseStatuses('deactivate')).toEqual([200, 400, 404, 409]);
    expect(responseStatuses('restore')).toEqual([200, 400, 404, 409]);
    expect(responseStatuses('addFacilities')).toEqual([200, 400, 404]);
    expect(responseStatuses('removeFacilities')).toEqual([200, 400, 404]);
  });

  it('delegates room type creation to the service', async () => {
    const dto: CreateRoomTypeDto = {
      code: 'DELUXE_KING',
      name: 'Deluxe King',
      maxOccupancy: 2,
      displayOrder: 10,
    };

    const response = createResponse();

    service.create.mockResolvedValue(response);

    await expect(controller.create(dto)).resolves.toBe(response);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates room type list queries to the service', async () => {
    const dto: RoomTypeQueryDto = {
      page: 2,
      limit: 5,
      search: 'deluxe',
      isActive: false,
    };
    const response = new PaginatedResult([createResponse({ isActive: false })], {
      page: 2,
      pageSize: 5,
      totalItems: 6,
      totalPages: 2,
    });

    service.list.mockResolvedValue(response);

    await expect(controller.list(dto)).resolves.toBe(response);
    expect(service.list).toHaveBeenCalledWith(dto);
  });

  it('delegates room type detail requests to the service', async () => {
    const response = createResponse();

    service.findOne.mockResolvedValue(response);

    await expect(controller.findOne(response.id)).resolves.toBe(response);
    expect(service.findOne).toHaveBeenCalledWith(response.id);
  });

  it('delegates room type updates to the service', async () => {
    const dto: UpdateRoomTypeDto = {
      name: 'Premier King',
      description: null,
      displayOrder: 20,
    };
    const response = createResponse({
      name: 'Premier King',
      description: null,
      displayOrder: 20,
    });

    service.update.mockResolvedValue(response);

    await expect(controller.update(response.id, dto)).resolves.toBe(response);
    expect(service.update).toHaveBeenCalledWith(response.id, dto);
  });

  it('delegates room type deactivation to the service', async () => {
    const response = createResponse({ isActive: false });

    service.deactivate.mockResolvedValue(response);

    await expect(controller.deactivate(response.id)).resolves.toBe(response);
    expect(service.deactivate).toHaveBeenCalledWith(response.id);
  });

  it('delegates room type restoration to the service', async () => {
    const response = createResponse({ isActive: true });

    service.restore.mockResolvedValue(response);

    await expect(controller.restore(response.id)).resolves.toBe(response);
    expect(service.restore).toHaveBeenCalledWith(response.id);
  });

  it('delegates facility additions to the service', async () => {
    const response = createResponse();
    const dto: RoomTypeFacilityIdsDto = {
      facilityIds: ['11111111-1111-4111-8111-111111111111'],
    };

    service.addFacilities.mockResolvedValue(response);

    await expect(controller.addFacilities(response.id, dto)).resolves.toBe(response);
    expect(service.addFacilities).toHaveBeenCalledWith(response.id, dto);
  });

  it('delegates facility removals to the service', async () => {
    const response = createResponse();
    const dto: RoomTypeFacilityIdsDto = {
      facilityIds: ['11111111-1111-4111-8111-111111111111'],
    };

    service.removeFacilities.mockResolvedValue(response);

    await expect(controller.removeFacilities(response.id, dto)).resolves.toBe(response);
    expect(service.removeFacilities).toHaveBeenCalledWith(response.id, dto);
  });
});
