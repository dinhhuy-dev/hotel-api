import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import type { AuthenticatedUser } from 'src/modules/identity-access/presentation/http/security/authenticated-user';
import { CustomerCreateReservationDto } from '../dto/create-reservation.dto';
import { CustomerReservationQueryDto } from '../dto/reservation-query.dto';
import { ReservationResponseDto } from '../dto/reservation-response.dto';
import { ReservationCommandService } from '../services/reservation-command.service';
import { ReservationQueryService } from '../services/reservation-query.service';
import { CustomerReservationController } from './customer-reservation.controller';

const apiResponseMetadataKey = 'swagger/apiResponse';

function handler(name: keyof CustomerReservationController): object {
  const value: unknown = Object.getOwnPropertyDescriptor(
    CustomerReservationController.prototype,
    name,
  )?.value;

  if (typeof value !== 'function') {
    throw new Error(`Expected ${name} handler to exist.`);
  }

  return value;
}

function responseStatuses(name: keyof CustomerReservationController): number[] {
  const responses: unknown = Reflect.getMetadata(apiResponseMetadataKey, handler(name));

  if (typeof responses !== 'object' || responses === null || Array.isArray(responses)) {
    throw new Error(`Expected ${name} handler to document API responses.`);
  }

  return Object.keys(responses).map(Number).sort();
}

describe('CustomerReservationController', () => {
  let controller: CustomerReservationController;
  let commandService: jest.Mocked<Pick<ReservationCommandService, 'createForCustomer'>>;
  let queryService: jest.Mocked<
    Pick<ReservationQueryService, 'listForCustomer' | 'findOneForCustomer'>
  >;
  const currentUser: AuthenticatedUser = {
    accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    role: AccountRole.CUSTOMER,
  };
  const reservation = {} as ReservationResponseDto;

  beforeEach(() => {
    commandService = { createForCustomer: jest.fn() };
    queryService = { listForCustomer: jest.fn(), findOneForCustomer: jest.fn() };
    controller = new CustomerReservationController(
      commandService as unknown as ReservationCommandService,
      queryService as unknown as ReservationQueryService,
    );
  });

  it('uses the approved Customer role and routes', () => {
    expect(Reflect.getMetadata(ROLES_KEY, CustomerReservationController)).toEqual([
      AccountRole.CUSTOMER,
    ]);
    expect(Reflect.getMetadata(PATH_METADATA, CustomerReservationController)).toBe(
      'v1/booking/customer/reservations',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler('create'))).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handler('create'))).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, handler('list'))).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, handler('list'))).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, handler('findOne'))).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, handler('findOne'))).toBe(':id');
  });

  it('documents operation-specific responses', () => {
    expect(responseStatuses('create')).toEqual([201, 400, 409]);
    expect(responseStatuses('list')).toEqual([200, 400]);
    expect(responseStatuses('findOne')).toEqual([200, 400, 404]);
  });

  it('forwards the authenticated account and idempotency key when creating', async () => {
    const dto = {} as CustomerCreateReservationDto;
    commandService.createForCustomer.mockResolvedValue(reservation);

    await expect(controller.create(currentUser, 'request-id', dto)).resolves.toBe(reservation);
    expect(commandService.createForCustomer).toHaveBeenCalledWith(
      currentUser.accountId,
      'request-id',
      dto,
    );
  });

  it('forwards ownership and preserves paginated list results', async () => {
    const dto = Object.assign(new CustomerReservationQueryDto(), { page: 2, limit: 5 });
    const result = new PaginatedResult([reservation], {
      page: 2,
      pageSize: 5,
      totalItems: 6,
      totalPages: 2,
    });
    queryService.listForCustomer.mockResolvedValue(result);

    await expect(controller.list(currentUser, dto)).resolves.toBe(result);
    expect(result).toBeInstanceOf(PaginatedResult);
    expect(queryService.listForCustomer).toHaveBeenCalledWith(currentUser.accountId, dto);
  });

  it('forwards ownership when reading one Reservation', async () => {
    queryService.findOneForCustomer.mockResolvedValue(reservation);

    await expect(controller.findOne(currentUser, 'reservation-id')).resolves.toBe(reservation);
    expect(queryService.findOneForCustomer).toHaveBeenCalledWith(
      currentUser.accountId,
      'reservation-id',
    );
  });
});
