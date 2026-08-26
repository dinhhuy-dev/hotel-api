import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { ReceptionistCreateReservationDto } from '../dto/create-reservation.dto';
import { ReservationResponseDto } from '../dto/reservation-response.dto';
import { CheckInService } from '../services/check-in.service';
import { CheckOutService } from '../services/check-out.service';
import { ReservationCommandService } from '../services/reservation-command.service';
import { ReceptionistReservationController } from './receptionist-reservation.controller';

const apiResponseMetadataKey = 'swagger/apiResponse';

function handler(name: keyof ReceptionistReservationController): object {
  const value: unknown = Object.getOwnPropertyDescriptor(
    ReceptionistReservationController.prototype,
    name,
  )?.value;

  if (typeof value !== 'function') {
    throw new Error(`Expected ${name} handler to exist.`);
  }

  return value;
}

function responses(name: keyof ReceptionistReservationController): Record<string, unknown> {
  const responses: unknown = Reflect.getMetadata(apiResponseMetadataKey, handler(name));

  if (typeof responses !== 'object' || responses === null || Array.isArray(responses)) {
    throw new Error(`Expected ${name} handler to document API responses.`);
  }

  return responses as Record<string, unknown>;
}

function responseStatuses(name: keyof ReceptionistReservationController): number[] {
  return Object.keys(responses(name)).map(Number).sort();
}

function responseDescription(
  name: keyof ReceptionistReservationController,
  status: number,
): string {
  const response = responses(name)[status];

  if (
    typeof response !== 'object' ||
    response === null ||
    !('description' in response) ||
    typeof response.description !== 'string'
  ) {
    throw new Error(`Expected ${name} ${status} response to have a description.`);
  }

  return response.description;
}

describe('ReceptionistReservationController', () => {
  let controller: ReceptionistReservationController;
  let service: jest.Mocked<
    Pick<
      ReservationCommandService,
      | 'createForReceptionist'
      | 'requestPaymentForReceptionist'
      | 'cancelForReceptionist'
      | 'markNoShow'
    >
  >;
  let checkInService: jest.Mocked<Pick<CheckInService, 'checkIn'>>;
  let checkOutService: jest.Mocked<Pick<CheckOutService, 'checkOut'>>;
  const reservation = {} as ReservationResponseDto;

  beforeEach(() => {
    service = {
      createForReceptionist: jest.fn(),
      requestPaymentForReceptionist: jest.fn(),
      cancelForReceptionist: jest.fn(),
      markNoShow: jest.fn(),
    };
    checkInService = { checkIn: jest.fn() };
    checkOutService = { checkOut: jest.fn() };
    controller = new ReceptionistReservationController(
      service as unknown as ReservationCommandService,
      checkInService as unknown as CheckInService,
      checkOutService as unknown as CheckOutService,
    );
  });

  it('uses the approved Receptionist role and route', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ReceptionistReservationController)).toEqual([
      AccountRole.RECEPTIONIST,
    ]);
    expect(Reflect.getMetadata(PATH_METADATA, ReceptionistReservationController)).toBe(
      'v1/booking/receptionist/reservations',
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler('create'))).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, handler('create'))).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handler('pay'))).toBe(':id/pay');
    expect(Reflect.getMetadata(METHOD_METADATA, handler('pay'))).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handler('cancel'))).toBe(':id/cancel');
    expect(Reflect.getMetadata(METHOD_METADATA, handler('cancel'))).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handler('markNoShow'))).toBe(':id/no-show');
    expect(Reflect.getMetadata(METHOD_METADATA, handler('markNoShow'))).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handler('checkIn'))).toBe(':id/check-in');
    expect(Reflect.getMetadata(METHOD_METADATA, handler('checkIn'))).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handler('checkOut'))).toBe(':id/check-out');
    expect(Reflect.getMetadata(METHOD_METADATA, handler('checkOut'))).toBe(RequestMethod.POST);
  });

  it('documents operation-specific responses', () => {
    expect(responseStatuses('create')).toEqual([201, 400, 409]);
    expect(responseStatuses('pay')).toEqual([202, 400, 404, 409]);
    expect(responseStatuses('cancel')).toEqual([200, 400, 404, 409]);
    expect(responseStatuses('markNoShow')).toEqual([200, 400, 404, 409]);
    expect(responseStatuses('checkIn')).toEqual([200, 400, 404, 409]);
    expect(responseStatuses('checkOut')).toEqual([200, 400, 404, 409]);
    expect(responseDescription('checkOut', 409)).toContain('assigned Room data');
  });

  it('forwards the idempotency key and supplied Customer UUID', async () => {
    const dto = { customerId: 'customer-id' } as ReceptionistCreateReservationDto;
    service.createForReceptionist.mockResolvedValue(reservation);

    await expect(controller.create('request-id', dto)).resolves.toBe(reservation);
    expect(service.createForReceptionist).toHaveBeenCalledWith('request-id', dto);
  });

  it('forwards payment initiation', async () => {
    service.requestPaymentForReceptionist.mockResolvedValue(reservation);

    await expect(controller.pay('reservation-id')).resolves.toBe(reservation);
    expect(service.requestPaymentForReceptionist).toHaveBeenCalledWith('reservation-id');
  });

  it('forwards cancellation', async () => {
    service.cancelForReceptionist.mockResolvedValue(reservation);

    await expect(controller.cancel('reservation-id')).resolves.toBe(reservation);
    expect(service.cancelForReceptionist).toHaveBeenCalledWith('reservation-id');
  });

  it('forwards no-show', async () => {
    service.markNoShow.mockResolvedValue(reservation);

    await expect(controller.markNoShow('reservation-id')).resolves.toBe(reservation);
    expect(service.markNoShow).toHaveBeenCalledWith('reservation-id');
  });

  it('forwards check-in Room identifiers', async () => {
    const dto = { roomIds: ['room-b', 'room-a'] };
    checkInService.checkIn.mockResolvedValue(reservation);

    await expect(controller.checkIn('reservation-id', dto)).resolves.toBe(reservation);
    expect(checkInService.checkIn).toHaveBeenCalledWith('reservation-id', dto.roomIds);
  });

  it('forwards check-out', async () => {
    checkOutService.checkOut.mockResolvedValue(reservation);

    await expect(controller.checkOut('reservation-id')).resolves.toBe(reservation);
    expect(checkOutService.checkOut).toHaveBeenCalledWith('reservation-id');
  });
});
