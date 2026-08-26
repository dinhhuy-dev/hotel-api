import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';
import { AvailabilityOptionDto } from '../dto/availability-response.dto';
import { AvailabilityService } from '../services/availability.service';
import { PublicAvailabilityController } from './public-availability.controller';

const apiResponseMetadataKey = 'swagger/apiResponse';

function responseStatuses(handlerName: keyof PublicAvailabilityController): number[] {
  const handler: unknown = Object.getOwnPropertyDescriptor(
    PublicAvailabilityController.prototype,
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

describe('PublicAvailabilityController', () => {
  let controller: PublicAvailabilityController;
  let service: jest.Mocked<Pick<AvailabilityService, 'search'>>;

  beforeEach(() => {
    service = { search: jest.fn() };
    controller = new PublicAvailabilityController(service as unknown as AvailabilityService);
  });

  it('allows unauthenticated access without role metadata', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PublicAvailabilityController)).toBe(true);
    expect(Reflect.getMetadata(ROLES_KEY, PublicAvailabilityController)).toBeUndefined();
  });

  it('uses the approved availability GET route', () => {
    const handler: unknown = Object.getOwnPropertyDescriptor(
      PublicAvailabilityController.prototype,
      'search',
    )?.value;

    if (typeof handler !== 'function') {
      throw new Error('Expected search handler to exist.');
    }

    expect(Reflect.getMetadata(PATH_METADATA, PublicAvailabilityController)).toBe(
      'v1/booking/availability',
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
  });

  it('documents availability success and validation errors', () => {
    expect(responseStatuses('search')).toEqual([200, 400]);
  });

  it('delegates the query and preserves a real paginated result', async () => {
    const dto: AvailabilityQueryDto = {
      checkInDate: '2026-09-01',
      checkOutDate: '2026-09-03',
      guestCount: 2,
      roomQuantity: 1,
      page: 1,
      limit: 10,
    };
    const option = {
      items: [],
      totalRoomQuantity: 1,
      totalCapacity: 2,
      totalPrice: 500000,
    } as AvailabilityOptionDto;
    const response = new PaginatedResult([option], {
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
    service.search.mockResolvedValue(response);

    const result = await controller.search(dto);

    expect(result).toBe(response);
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(service.search).toHaveBeenCalledWith(dto);
  });
});
