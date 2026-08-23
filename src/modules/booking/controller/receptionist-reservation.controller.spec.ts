import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { ReceptionistCreateReservationDto } from '../dto/create-reservation.dto';
import { ReservationResponseDto } from '../dto/reservation-response.dto';
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

function responseStatuses(name: keyof ReceptionistReservationController): number[] {
  const responses: unknown = Reflect.getMetadata(apiResponseMetadataKey, handler(name));

  if (typeof responses !== 'object' || responses === null || Array.isArray(responses)) {
    throw new Error(`Expected ${name} handler to document API responses.`);
  }

  return Object.keys(responses).map(Number).sort();
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
  const reservation = {} as ReservationResponseDto;

  beforeEach(() => {
    service = {
      createForReceptionist: jest.fn(),
      requestPaymentForReceptionist: jest.fn(),
      cancelForReceptionist: jest.fn(),
      markNoShow: jest.fn(),
    };
    controller = new ReceptionistReservationController(
      service as unknown as ReservationCommandService,
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
  });

  it('documents operation-specific responses', () => {
    expect(responseStatuses('create')).toEqual([201, 400, 409]);
    expect(responseStatuses('pay')).toEqual([202, 400, 404, 409]);
    expect(responseStatuses('cancel')).toEqual([200, 400, 404, 409]);
    expect(responseStatuses('markNoShow')).toEqual([200, 400, 404, 409]);
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
});
