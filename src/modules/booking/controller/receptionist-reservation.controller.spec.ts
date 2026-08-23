import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { ReceptionistCreateReservationDto } from '../dto/create-reservation.dto';
import { ReservationResponseDto } from '../dto/reservation-response.dto';
import { ReservationCommandService } from '../services/reservation-command.service';
import { ReceptionistReservationController } from './receptionist-reservation.controller';

const apiResponseMetadataKey = 'swagger/apiResponse';

function createHandler(): object {
  const value: unknown = Object.getOwnPropertyDescriptor(
    ReceptionistReservationController.prototype,
    'create',
  )?.value;

  if (typeof value !== 'function') {
    throw new Error('Expected create handler to exist.');
  }

  return value;
}

describe('ReceptionistReservationController', () => {
  let controller: ReceptionistReservationController;
  let service: jest.Mocked<Pick<ReservationCommandService, 'createForReceptionist'>>;

  beforeEach(() => {
    service = { createForReceptionist: jest.fn() };
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
    expect(Reflect.getMetadata(PATH_METADATA, createHandler())).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, createHandler())).toBe(RequestMethod.POST);
  });

  it('documents creation responses', () => {
    const responses: unknown = Reflect.getMetadata(apiResponseMetadataKey, createHandler());

    if (typeof responses !== 'object' || responses === null || Array.isArray(responses)) {
      throw new Error('Expected create handler to document API responses.');
    }

    expect(Object.keys(responses).map(Number).sort()).toEqual([201, 400, 409]);
  });

  it('forwards the idempotency key and supplied Customer UUID', async () => {
    const dto = { customerId: 'customer-id' } as ReceptionistCreateReservationDto;
    const reservation = {} as ReservationResponseDto;
    service.createForReceptionist.mockResolvedValue(reservation);

    await expect(controller.create('request-id', dto)).resolves.toBe(reservation);
    expect(service.createForReceptionist).toHaveBeenCalledWith('request-id', dto);
  });
});
