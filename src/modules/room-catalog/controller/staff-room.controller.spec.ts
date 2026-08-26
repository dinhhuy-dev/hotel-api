import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { RoomQueryDto } from '../dto/room/room-query.dto';
import { StaffRoomResponseDto } from '../dto/room/room-response.dto';
import { OperationalStatus } from '../entities/enum/operational-status';
import { RoomService } from '../services/room.service';
import { StaffRoomController } from './staff-room.controller';

const apiResponseMetadataKey = 'swagger/apiResponse';

function responseStatuses(handlerName: keyof StaffRoomController): number[] {
  const handler: unknown = Object.getOwnPropertyDescriptor(
    StaffRoomController.prototype,
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

function createResponse(overrides: Partial<StaffRoomResponseDto> = {}): StaffRoomResponseDto {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    roomNumber: 'A-101',
    floor: 'A',
    operationalStatus: OperationalStatus.Ready,
    roomType: {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      code: 'DELUXE_KING',
      name: 'Deluxe King',
      maxOccupancy: 2,
      bedConfiguration: 'One king bed',
      facilities: [],
    },
    ...overrides,
  };
}

describe('StaffRoomController', () => {
  let controller: StaffRoomController;
  let service: jest.Mocked<Pick<RoomService, 'listForStaff' | 'findOneForStaff'>>;

  beforeEach(() => {
    service = {
      listForStaff: jest.fn(),
      findOneForStaff: jest.fn(),
    };

    controller = new StaffRoomController(service as unknown as RoomService);
  });

  it('requires every non-customer staff role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, StaffRoomController)).toEqual([
      AccountRole.ADMINISTRATOR,
      AccountRole.HOTEL_MANAGER,
      AccountRole.RECEPTIONIST,
      AccountRole.HOUSEKEEPING_STAFF,
      AccountRole.MAINTENANCE_STAFF,
    ]);
  });

  it('documents success and hidden retired room behavior for staff routes', () => {
    expect(responseStatuses('list')).toEqual([200, 400]);
    expect(responseStatuses('findOne')).toEqual([200, 400, 404]);
  });

  it('delegates staff room list and detail requests to the service', async () => {
    const dto: RoomQueryDto = {
      page: 1,
      limit: 10,
      floor: 'A',
    };
    const response = createResponse();
    const listResponse = new PaginatedResult([response], {
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });

    service.listForStaff.mockResolvedValue(listResponse);
    service.findOneForStaff.mockResolvedValue(response);

    await expect(controller.list(dto)).resolves.toBe(listResponse);
    await expect(controller.findOne(response.id)).resolves.toBe(response);
    expect(service.listForStaff).toHaveBeenCalledWith(dto);
    expect(service.findOneForStaff).toHaveBeenCalledWith(response.id);
  });
});
