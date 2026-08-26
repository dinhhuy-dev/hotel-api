import type { BookingRoomCatalogService } from '../../room-catalog/contracts/booking-room-catalog.contract';
import type { DataSource, EntityManager } from 'typeorm';
import { PaymentStatus } from '../entities/enum/payment-status';
import { ReservationStatus } from '../entities/enum/reservation-status';
import { ReservationItem } from '../entities/reservation-item.entity';
import { Reservation } from '../entities/reservation.entity';
import { RoomAssignment } from '../entities/room-assignment.entity';
import type { BookingRepositoryPort } from '../repositories/ports/booking-repository.port';
import { CheckOutService } from './check-out.service';

const RESERVATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ITEM_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ROOM_TYPE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const FIRST_ROOM_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_ROOM_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-02T03:00:00.000Z');

function createAssignment(id: string, roomId: string): RoomAssignment {
  return Object.assign(new RoomAssignment(), {
    id,
    reservationItemId: ITEM_ID,
    roomId,
    assignedAt: new Date('2026-09-01T07:00:00.000Z'),
    releasedAt: null,
  });
}

function createReservation(assignments: RoomAssignment[]): Reservation {
  const item = Object.assign(new ReservationItem(), {
    id: ITEM_ID,
    reservationId: RESERVATION_ID,
    roomTypeId: ROOM_TYPE_ID,
    quantity: assignments.length,
    totalPrice: 900000,
    assignments,
  });

  return Object.assign(new Reservation(), {
    id: RESERVATION_ID,
    customerId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    contactName: 'Alex Nguyen',
    contactPhone: '+84901234567',
    checkInDate: '2026-09-01',
    checkOutDate: '2026-09-10',
    guestCount: 2,
    status: ReservationStatus.CheckedIn,
    totalAmount: 900000,
    expiresAt: new Date('2026-08-31T03:15:00.000Z'),
    paymentStatus: PaymentStatus.Paid,
    chargeRequestId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    chargeReference: 'mock-charge-reference',
    refundRequestId: null,
    refundReference: null,
    idempotencyKey: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    cancellationReason: null,
    checkedInAt: new Date('2026-09-01T07:00:00.000Z'),
    checkedOutAt: null,
    createdAt: new Date('2026-08-31T03:00:00.000Z'),
    updatedAt: new Date('2026-09-01T07:00:00.000Z'),
    items: [item],
  });
}

describe('CheckOutService', () => {
  let service: CheckOutService;
  let repository: jest.Mocked<
    Pick<
      BookingRepositoryPort,
      | 'findAndLockById'
      | 'findAndLockActiveAssignmentsByReservationId'
      | 'saveRoomAssignments'
      | 'saveReservation'
      | 'findWithDetailsById'
    >
  >;
  let roomCatalogService: jest.Mocked<
    Pick<BookingRoomCatalogService, 'findRoomsForAssignment' | 'markRoomsDirty'>
  >;
  let manager: EntityManager;
  let reservation: Reservation;
  let assignments: RoomAssignment[];
  let now: jest.Mock;
  let publish: jest.Mock;
  let transaction: jest.Mock;
  let callOrder: string[];

  beforeEach(() => {
    callOrder = [];
    assignments = [
      createAssignment('22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa', SECOND_ROOM_ID),
      createAssignment('11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', FIRST_ROOM_ID),
    ];
    reservation = createReservation(assignments);
    manager = {} as EntityManager;
    repository = {
      findAndLockById: jest.fn(() => {
        callOrder.push('reservation');
        return Promise.resolve(reservation);
      }),
      findAndLockActiveAssignmentsByReservationId: jest.fn(() => {
        callOrder.push('assignments');
        return Promise.resolve(assignments);
      }),
      saveRoomAssignments: jest.fn((current) => {
        callOrder.push('save-assignments');
        return Promise.resolve([...current]);
      }),
      saveReservation: jest.fn((current) => {
        callOrder.push('save-reservation');
        return Promise.resolve(current);
      }),
      findWithDetailsById: jest.fn(() => {
        callOrder.push('details');
        return Promise.resolve(reservation);
      }),
    };
    roomCatalogService = {
      findRoomsForAssignment: jest.fn(() => {
        callOrder.push('rooms');
        return Promise.resolve([
          {
            id: SECOND_ROOM_ID,
            roomTypeId: ROOM_TYPE_ID,
            roomNumber: 'A-102',
            operationalStatus: 'READY',
          },
          {
            id: FIRST_ROOM_ID,
            roomTypeId: ROOM_TYPE_ID,
            roomNumber: 'A-101',
            operationalStatus: 'READY',
          },
        ]);
      }),
      markRoomsDirty: jest.fn(() => {
        callOrder.push('dirty');
        return Promise.resolve();
      }),
    };
    now = jest.fn(() => {
      callOrder.push('clock');
      return NOW;
    });
    publish = jest.fn(() => callOrder.push('publish'));
    transaction = jest.fn(async (work: (transactionManager: EntityManager) => Promise<unknown>) => {
      const result = await work(manager);
      callOrder.push('commit');
      return result;
    });
    service = new CheckOutService(
      repository,
      roomCatalogService,
      { now, today: jest.fn() },
      { publish },
      { transaction } as unknown as DataSource,
    );
  });

  it('checks out early atomically with sorted Room locks and one timestamp', async () => {
    const result = await service.checkOut(RESERVATION_ID);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(repository.findAndLockById).toHaveBeenCalledWith(RESERVATION_ID, manager);
    expect(repository.findAndLockActiveAssignmentsByReservationId).toHaveBeenCalledWith(
      RESERVATION_ID,
      manager,
    );
    expect(roomCatalogService.findRoomsForAssignment).toHaveBeenCalledWith(
      { roomIds: [FIRST_ROOM_ID, SECOND_ROOM_ID], lockForUpdate: true },
      manager,
    );
    expect(roomCatalogService.markRoomsDirty).toHaveBeenCalledWith(
      [FIRST_ROOM_ID, SECOND_ROOM_ID],
      manager,
    );
    expect(repository.saveRoomAssignments).toHaveBeenCalledWith(assignments, manager);
    expect(repository.saveReservation).toHaveBeenCalledWith(reservation, manager);
    expect(repository.findWithDetailsById).toHaveBeenCalledWith(RESERVATION_ID, manager);
    expect(now).toHaveBeenCalledTimes(1);
    expect(assignments.every((assignment) => assignment.releasedAt === NOW)).toBe(true);
    expect(reservation).toMatchObject({
      status: ReservationStatus.CheckedOut,
      checkedOutAt: NOW,
      totalAmount: 900000,
    });
    expect(result).toMatchObject({
      id: RESERVATION_ID,
      status: ReservationStatus.CheckedOut,
      checkedOutAt: NOW.toISOString(),
      totalAmount: 900000,
      assignments: [
        { roomId: FIRST_ROOM_ID, roomNumber: 'A-101' },
        { roomId: SECOND_ROOM_ID, roomNumber: 'A-102' },
      ],
    });
    expect(publish).toHaveBeenCalledWith({
      type: 'RoomsCheckedOut',
      reservationId: RESERVATION_ID,
      roomIds: [FIRST_ROOM_ID, SECOND_ROOM_ID],
      checkedOutAt: NOW.toISOString(),
    });
    expect(callOrder).toEqual([
      'reservation',
      'assignments',
      'rooms',
      'clock',
      'dirty',
      'save-assignments',
      'save-reservation',
      'details',
      'commit',
      'publish',
    ]);
  });

  it('returns RESERVATION_NOT_FOUND before other work when the Reservation is missing', async () => {
    repository.findAndLockById.mockResolvedValue(null);

    await expect(service.checkOut(RESERVATION_ID)).rejects.toMatchObject({
      response: { error: 'RESERVATION_NOT_FOUND' },
    });
    expect(repository.findAndLockActiveAssignmentsByReservationId).not.toHaveBeenCalled();
    expect(roomCatalogService.findRoomsForAssignment).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('rejects a Reservation that is not CHECKED_IN', async () => {
    reservation.status = ReservationStatus.Confirmed;

    await expect(service.checkOut(RESERVATION_ID)).rejects.toMatchObject({
      response: { error: 'INVALID_RESERVATION_STATE' },
    });
    expect(repository.findAndLockActiveAssignmentsByReservationId).not.toHaveBeenCalled();
    expect(roomCatalogService.markRoomsDirty).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('rejects a checked-in Reservation without active assignments', async () => {
    repository.findAndLockActiveAssignmentsByReservationId.mockResolvedValue([]);

    await expect(service.checkOut(RESERVATION_ID)).rejects.toMatchObject({
      response: { error: 'ROOM_ASSIGNMENT_UNAVAILABLE' },
    });
    expect(roomCatalogService.findRoomsForAssignment).not.toHaveBeenCalled();
    expect(roomCatalogService.markRoomsDirty).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('rejects duplicate active Room assignments before locking Rooms', async () => {
    repository.findAndLockActiveAssignmentsByReservationId.mockResolvedValue([
      assignments[0],
      createAssignment('33333333-aaaa-4aaa-8aaa-aaaaaaaaaaaa', SECOND_ROOM_ID),
    ]);

    await expect(service.checkOut(RESERVATION_ID)).rejects.toMatchObject({
      response: { error: 'ROOM_ASSIGNMENT_UNAVAILABLE' },
    });
    expect(roomCatalogService.findRoomsForAssignment).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('rejects incomplete locked Room facts without writes or publication', async () => {
    roomCatalogService.findRoomsForAssignment.mockResolvedValue([
      {
        id: FIRST_ROOM_ID,
        roomTypeId: ROOM_TYPE_ID,
        roomNumber: 'A-101',
        operationalStatus: 'READY',
      },
    ]);

    await expect(service.checkOut(RESERVATION_ID)).rejects.toMatchObject({
      response: { error: 'ROOM_ASSIGNMENT_UNAVAILABLE' },
    });
    expect(now).not.toHaveBeenCalled();
    expect(roomCatalogService.markRoomsDirty).not.toHaveBeenCalled();
    expect(repository.saveRoomAssignments).not.toHaveBeenCalled();
    expect(repository.saveReservation).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('does not persist or publish when marking Rooms DIRTY fails', async () => {
    roomCatalogService.markRoomsDirty.mockRejectedValue(new Error('Room update failed.'));

    await expect(service.checkOut(RESERVATION_ID)).rejects.toThrow('Room update failed.');
    expect(repository.saveRoomAssignments).not.toHaveBeenCalled();
    expect(repository.saveReservation).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(callOrder).not.toContain('commit');
  });

  it('does not save the Reservation or publish when assignment release fails', async () => {
    repository.saveRoomAssignments.mockRejectedValue(new Error('Assignment update failed.'));

    await expect(service.checkOut(RESERVATION_ID)).rejects.toThrow('Assignment update failed.');
    expect(roomCatalogService.markRoomsDirty).toHaveBeenCalledWith(
      [FIRST_ROOM_ID, SECOND_ROOM_ID],
      manager,
    );
    expect(repository.saveReservation).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(callOrder).not.toContain('commit');
  });
});
