import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { StaffReservationQueryDto } from '../dto/reservation-query.dto';
import { ReservationResponseDto } from '../dto/reservation-response.dto';
import { ReservationQueryService } from '../services/reservation-query.service';
import { StaffReservationController } from './staff-reservation.controller';

const apiResponseMetadataKey = 'swagger/apiResponse';

function handler(name: keyof StaffReservationController): object {
  const value: unknown = Object.getOwnPropertyDescriptor(
    StaffReservationController.prototype,
    name,
  )?.value;

  if (typeof value !== 'function') {
    throw new Error(`Expected ${name} handler to exist.`);
  }

  return value;
}

function responseStatuses(name: keyof StaffReservationController): number[] {
  const responses: unknown = Reflect.getMetadata(apiResponseMetadataKey, handler(name));

  if (typeof responses !== 'object' || responses === null || Array.isArray(responses)) {
    throw new Error(`Expected ${name} handler to document API responses.`);
  }

  return Object.keys(responses).map(Number).sort();
}

describe('StaffReservationController', () => {
  let controller: StaffReservationController;
  let service: jest.Mocked<Pick<ReservationQueryService, 'listForStaff' | 'findOneForStaff'>>;
  const reservation = {} as ReservationResponseDto;

  beforeEach(() => {
    service = { listForStaff: jest.fn(), findOneForStaff: jest.fn() };
    controller = new StaffReservationController(service as unknown as ReservationQueryService);
  });

  it('uses the approved staff roles and routes', () => {
    expect(Reflect.getMetadata(ROLES_KEY, StaffReservationController)).toEqual([
      AccountRole.RECEPTIONIST,
      AccountRole.HOTEL_MANAGER,
    ]);
    expect(Reflect.getMetadata(PATH_METADATA, StaffReservationController)).toBe(
      'v1/booking/staff/reservations',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler('list'))).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, handler('list'))).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, handler('findOne'))).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, handler('findOne'))).toBe(':id');
  });

  it('documents operation-specific responses', () => {
    expect(responseStatuses('list')).toEqual([200, 400]);
    expect(responseStatuses('findOne')).toEqual([200, 400, 404]);
  });

  it('delegates filters and preserves a paginated result', async () => {
    const dto = Object.assign(new StaffReservationQueryDto(), { page: 1, limit: 10 });
    const result = new PaginatedResult([reservation], {
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
    service.listForStaff.mockResolvedValue(result);

    await expect(controller.list(dto)).resolves.toBe(result);
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(service.listForStaff).toHaveBeenCalledWith(dto);
  });

  it('delegates detail reads', async () => {
    service.findOneForStaff.mockResolvedValue(reservation);

    await expect(controller.findOne('reservation-id')).resolves.toBe(reservation);
    expect(service.findOneForStaff).toHaveBeenCalledWith('reservation-id');
  });
});
