import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { PublicRoomTypeQueryDto } from '../dto/room-type/public-room-type-query.dto';
import {
  PublicRoomTypeDetailDto,
  PublicRoomTypeListItemDto,
} from '../dto/room-type/public-room-type-response.dto';
import { RoomTypeService } from '../services/room-type.service';
import { PublicRoomTypeController } from './public-room-type.controller';

const apiResponseMetadataKey = 'swagger/apiResponse';

function responseStatuses(handlerName: keyof PublicRoomTypeController): number[] {
  const handler: unknown = Object.getOwnPropertyDescriptor(
    PublicRoomTypeController.prototype,
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

function createListItem(
  overrides: Partial<PublicRoomTypeListItemDto> = {},
): PublicRoomTypeListItemDto {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    code: 'DELUXE_KING',
    name: 'Deluxe King',
    maxOccupancy: 2,
    bedConfiguration: 'One king bed',
    displayOrder: 10,
    ...overrides,
  };
}

describe('PublicRoomTypeController', () => {
  let controller: PublicRoomTypeController;
  let service: jest.Mocked<Pick<RoomTypeService, 'listPublic' | 'findPublicOne'>>;

  beforeEach(() => {
    service = {
      listPublic: jest.fn(),
      findPublicOne: jest.fn(),
    };

    controller = new PublicRoomTypeController(service as unknown as RoomTypeService);
  });

  it('allows unauthenticated access without role metadata', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PublicRoomTypeController)).toBe(true);
    expect(Reflect.getMetadata(ROLES_KEY, PublicRoomTypeController)).toBeUndefined();
  });

  it('documents public query success and error responses', () => {
    expect(responseStatuses('list')).toEqual([200, 400]);
    expect(responseStatuses('findOne')).toEqual([200, 400, 404]);
  });

  it('delegates public room type list queries to the service', async () => {
    const dto: PublicRoomTypeQueryDto = {
      page: 2,
      limit: 5,
      search: 'deluxe',
    };
    const response = new PaginatedResult([createListItem()], {
      page: 2,
      pageSize: 5,
      totalItems: 6,
      totalPages: 2,
    });

    service.listPublic.mockResolvedValue(response);

    await expect(controller.list(dto)).resolves.toBe(response);
    expect(service.listPublic).toHaveBeenCalledWith(dto);
  });

  it('delegates public room type detail requests to the service', async () => {
    const response: PublicRoomTypeDetailDto = {
      ...createListItem(),
      description: 'A spacious room.',
      facilities: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Free Wi-Fi',
          description: 'Fast wireless internet.',
        },
      ],
    };

    service.findPublicOne.mockResolvedValue(response);

    await expect(controller.findOne(response.id)).resolves.toBe(response);
    expect(service.findPublicOne).toHaveBeenCalledWith(response.id);
  });
});
