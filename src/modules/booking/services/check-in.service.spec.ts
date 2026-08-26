import type {
  BookingAssignmentRoom,
  BookingRoomCatalogService,
} from '../../room-catalog/contracts/booking-room-catalog.contract';
import type { DataSource, EntityManager } from 'typeorm';
import type { BookingClock } from '../contracts/booking-clock.contract';
import { PaymentStatus } from '../entities/enum/payment-status';
import { ReservationStatus } from '../entities/enum/reservation-status';
import { ReservationItem } from '../entities/reservation-item.entity';
import { Reservation } from '../entities/reservation.entity';
import { RoomAssignment } from '../entities/room-assignment.entity';
import type { BookingRepositoryPort } from '../repositories/ports/booking-repository.port';
import { CheckInService } from './check-in.service';

const RESERVATION_ID = '11111111-1111-4111-8111-111111111111';
const FIRST_ITEM_ID = '22222222-2222-4222-8222-222222222222';
const SECOND_ITEM_ID = '33333333-3333-4333-8333-333333333333';
const FIRST_ROOM_TYPE_ID = '44444444-4444-4444-8444-444444444444';
const SECOND_ROOM_TYPE_ID = '55555555-5555-4555-8555-555555555555';
const FIRST_ROOM_ID = '66666666-6666-4666-8666-666666666666';
const SECOND_ROOM_ID = '77777777-7777-4777-8777-777777777777';
const THIRD_ROOM_ID = '88888888-8888-4888-8888-888888888888';
const NOW = new Date('2026-09-02T02:00:00.000Z');
const CREATED_AT = new Date('2026-08-24T01:00:00.000Z');

type CheckInRepository = Pick<
  BookingRepositoryPort,
  | 'findAndLockById'
  | 'findWithDetailsById'
  | 'findActiveAssignmentsByRoomIds'
  | 'saveRoomAssignments'
  | 'saveReservation'
>;

function createItem(id: string, roomTypeId: string, quantity: number): ReservationItem {
  return Object.assign(new ReservationItem(), {
    id,
    reservationId: RESERVATION_ID,
    roomTypeId,
    quantity,
    totalPrice: quantity * 300000,
    assignments: [],
  });
}

function createReservation(overrides: Partial<Reservation> = {}): Reservation {
  return Object.assign(new Reservation(), {
    id: RESERVATION_ID,
    customerId: '99999999-9999-4999-8999-999999999999',
    contactName: 'Stored Contact',
    contactPhone: '+84901234567',
    checkInDate: '2026-09-01',
    checkOutDate: '2026-09-04',
    guestCount: 4,
    status: ReservationStatus.Confirmed,
    totalAmount: 900000,
    expiresAt: new Date('2026-08-24T01:15:00.000Z'),
    paymentStatus: PaymentStatus.Paid,
    chargeRequestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    chargeReference: 'charge-reference',
    refundRequestId: null,
    refundReference: null,
    idempotencyKey: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    cancellationReason: null,
    checkedInAt: null,
    checkedOutAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    items: [
      createItem(FIRST_ITEM_ID, FIRST_ROOM_TYPE_ID, 2),
      createItem(SECOND_ITEM_ID, SECOND_ROOM_TYPE_ID, 1),
    ],
    ...overrides,
  });
}

function createRoom(
  id: string,
  roomTypeId: string,
  roomNumber: string,
  overrides: Partial<BookingAssignmentRoom> = {},
): BookingAssignmentRoom {
  return {
    id,
    roomTypeId,
    roomNumber,
    operationalStatus: 'READY',
    ...overrides,
  };
}

function createRooms(): BookingAssignmentRoom[] {
  return [
    createRoom(THIRD_ROOM_ID, SECOND_ROOM_TYPE_ID, 'B-201'),
    createRoom(FIRST_ROOM_ID, FIRST_ROOM_TYPE_ID, 'A-101'),
    createRoom(SECOND_ROOM_ID, FIRST_ROOM_TYPE_ID, 'A-102'),
  ];
}

describe('CheckInService', () => {
  let service: CheckInService;
  let repository: jest.Mocked<CheckInRepository>;
  let roomCatalogService: jest.Mocked<Pick<BookingRoomCatalogService, 'findRoomsForAssignment'>>;
  let clock: jest.Mocked<BookingClock>;
  let manager: EntityManager;
  let transaction: jest.Mock;
  let reservation: Reservation;
  let details: Reservation;

  beforeEach(() => {
    manager = { queryRunner: { data: 'check-in-manager' } } as unknown as EntityManager;
    reservation = createReservation();
    details = createReservation();
    repository = {
      findAndLockById: jest.fn().mockResolvedValue(reservation),
      findWithDetailsById: jest.fn().mockResolvedValue(details),
      findActiveAssignmentsByRoomIds: jest.fn().mockResolvedValue([]),
      saveRoomAssignments: jest.fn().mockImplementation((assignments: readonly RoomAssignment[]) =>
        Promise.resolve(
          assignments.map((assignment, index) =>
            Object.assign(assignment, {
              id: `cccccccc-cccc-4ccc-8ccc-${String(index + 1).padStart(12, '0')}`,
            }),
          ),
        ),
      ),
      saveReservation: jest
        .fn()
        .mockImplementation((current: Reservation) => Promise.resolve(current)),
    };
    roomCatalogService = {
      findRoomsForAssignment: jest.fn().mockResolvedValue(createRooms()),
    };
    clock = {
      today: jest.fn().mockReturnValue('2026-09-02'),
      now: jest.fn().mockReturnValue(NOW),
    };
    transaction = jest
      .fn()
      .mockImplementation((work: (transactionManager: EntityManager) => unknown) =>
        Promise.resolve(work(manager)),
      );
    service = new CheckInService(repository, roomCatalogService, clock, {
      manager,
      transaction,
    } as unknown as DataSource);
  });

  it('checks in atomically with sorted Room locks, exact assignments, and one manager', async () => {
    const result = await service.checkIn(RESERVATION_ID, [
      THIRD_ROOM_ID,
      SECOND_ROOM_ID,
      FIRST_ROOM_ID,
    ]);

    const sortedRoomIds = [FIRST_ROOM_ID, SECOND_ROOM_ID, THIRD_ROOM_ID];
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(repository.findAndLockById).toHaveBeenCalledWith(RESERVATION_ID, manager);
    expect(repository.findWithDetailsById).toHaveBeenCalledWith(RESERVATION_ID, manager);
    expect(roomCatalogService.findRoomsForAssignment).toHaveBeenCalledWith(
      { roomIds: sortedRoomIds, lockForUpdate: true },
      manager,
    );
    expect(repository.findActiveAssignmentsByRoomIds).toHaveBeenCalledWith(sortedRoomIds, manager);
    expect(repository.findAndLockById.mock.invocationCallOrder[0]).toBeLessThan(
      roomCatalogService.findRoomsForAssignment.mock.invocationCallOrder[0],
    );

    const assignments = repository.saveRoomAssignments.mock.calls[0][0];
    expect(assignments).toEqual([
      expect.objectContaining({
        reservationItemId: FIRST_ITEM_ID,
        roomId: FIRST_ROOM_ID,
        assignedAt: NOW,
        releasedAt: null,
      }),
      expect.objectContaining({
        reservationItemId: FIRST_ITEM_ID,
        roomId: SECOND_ROOM_ID,
        assignedAt: NOW,
        releasedAt: null,
      }),
      expect.objectContaining({
        reservationItemId: SECOND_ITEM_ID,
        roomId: THIRD_ROOM_ID,
        assignedAt: NOW,
        releasedAt: null,
      }),
    ]);
    expect(repository.saveRoomAssignments).toHaveBeenCalledWith(assignments, manager);
    expect(repository.saveReservation).toHaveBeenCalledWith(reservation, manager);
    expect(reservation).toMatchObject({
      status: ReservationStatus.CheckedIn,
      checkedInAt: NOW,
    });
    expect(result).toMatchObject({
      id: RESERVATION_ID,
      status: ReservationStatus.CheckedIn,
      checkedInAt: NOW.toISOString(),
      assignments: [
        { roomId: FIRST_ROOM_ID, roomNumber: 'A-101' },
        { roomId: SECOND_ROOM_ID, roomNumber: 'A-102' },
        { roomId: THIRD_ROOM_ID, roomNumber: 'B-201' },
      ],
    });
  });

  it('returns not found before reading Reservation details or Rooms', async () => {
    repository.findAndLockById.mockResolvedValue(null);

    await expect(service.checkIn(RESERVATION_ID, [FIRST_ROOM_ID])).rejects.toMatchObject({
      response: { error: 'RESERVATION_NOT_FOUND' },
    });
    expect(repository.findWithDetailsById).not.toHaveBeenCalled();
    expect(roomCatalogService.findRoomsForAssignment).not.toHaveBeenCalled();
  });

  it.each([
    ['pending status', { status: ReservationStatus.Pending }, '2026-09-02'],
    ['already checked in', { status: ReservationStatus.CheckedIn }, '2026-09-02'],
    ['unpaid state', { paymentStatus: PaymentStatus.Unpaid }, '2026-09-02'],
    ['a date before check-in', {}, '2026-08-31'],
    ['the check-out date', {}, '2026-09-04'],
  ])('rejects check-in for %s', async (_case, overrides, today) => {
    repository.findAndLockById.mockResolvedValue(createReservation(overrides));
    clock.today.mockReturnValue(today);

    await expect(
      service.checkIn(RESERVATION_ID, [FIRST_ROOM_ID, SECOND_ROOM_ID, THIRD_ROOM_ID]),
    ).rejects.toMatchObject({ response: { error: 'INVALID_RESERVATION_STATE' } });
    expect(repository.findWithDetailsById).not.toHaveBeenCalled();
    expect(roomCatalogService.findRoomsForAssignment).not.toHaveBeenCalled();
  });

  it.each([
    ['duplicate Room IDs', [FIRST_ROOM_ID, FIRST_ROOM_ID, THIRD_ROOM_ID]],
    ['too few Room IDs', [FIRST_ROOM_ID, THIRD_ROOM_ID]],
    [
      'too many Room IDs',
      [FIRST_ROOM_ID, SECOND_ROOM_ID, THIRD_ROOM_ID, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'],
    ],
  ])('rejects %s before locking physical Rooms', async (_case, roomIds) => {
    await expect(service.checkIn(RESERVATION_ID, roomIds)).rejects.toMatchObject({
      response: { error: 'ROOM_ASSIGNMENT_UNAVAILABLE' },
    });
    expect(roomCatalogService.findRoomsForAssignment).not.toHaveBeenCalled();
    expect(repository.saveRoomAssignments).not.toHaveBeenCalled();
  });

  it('rejects a Reservation whose item details cannot be loaded', async () => {
    repository.findWithDetailsById.mockResolvedValue(null);

    await expect(
      service.checkIn(RESERVATION_ID, [FIRST_ROOM_ID, SECOND_ROOM_ID, THIRD_ROOM_ID]),
    ).rejects.toMatchObject({ response: { error: 'ROOM_ASSIGNMENT_UNAVAILABLE' } });
    expect(roomCatalogService.findRoomsForAssignment).not.toHaveBeenCalled();
  });

  it('rejects when any requested Room ID is missing from locked Room facts', async () => {
    roomCatalogService.findRoomsForAssignment.mockResolvedValue(createRooms().slice(0, 2));

    await expect(
      service.checkIn(RESERVATION_ID, [FIRST_ROOM_ID, SECOND_ROOM_ID, THIRD_ROOM_ID]),
    ).rejects.toMatchObject({ response: { error: 'ROOM_ASSIGNMENT_UNAVAILABLE' } });
    expect(repository.findActiveAssignmentsByRoomIds).not.toHaveBeenCalled();
  });

  it('rejects duplicate locked Room facts', async () => {
    roomCatalogService.findRoomsForAssignment.mockResolvedValue([
      ...createRooms(),
      createRoom(FIRST_ROOM_ID, FIRST_ROOM_TYPE_ID, 'A-101'),
    ]);

    await expect(
      service.checkIn(RESERVATION_ID, [FIRST_ROOM_ID, SECOND_ROOM_ID, THIRD_ROOM_ID]),
    ).rejects.toMatchObject({ response: { error: 'ROOM_ASSIGNMENT_UNAVAILABLE' } });
    expect(repository.findActiveAssignmentsByRoomIds).not.toHaveBeenCalled();
  });

  it.each(['DIRTY', 'CLEANING', 'OUT_OF_SERVICE', 'RETIRED'] as const)(
    'rejects a Room in %s status',
    async (operationalStatus) => {
      roomCatalogService.findRoomsForAssignment.mockResolvedValue([
        ...createRooms().slice(0, 2),
        createRoom(SECOND_ROOM_ID, FIRST_ROOM_TYPE_ID, 'A-102', { operationalStatus }),
      ]);

      await expect(
        service.checkIn(RESERVATION_ID, [FIRST_ROOM_ID, SECOND_ROOM_ID, THIRD_ROOM_ID]),
      ).rejects.toMatchObject({ response: { error: 'ROOM_ASSIGNMENT_UNAVAILABLE' } });
      expect(repository.findActiveAssignmentsByRoomIds).not.toHaveBeenCalled();
    },
  );

  it('rejects Rooms that do not match exact Reservation Room Type quantities', async () => {
    roomCatalogService.findRoomsForAssignment.mockResolvedValue([
      createRoom(FIRST_ROOM_ID, FIRST_ROOM_TYPE_ID, 'A-101'),
      createRoom(SECOND_ROOM_ID, SECOND_ROOM_TYPE_ID, 'B-201'),
      createRoom(THIRD_ROOM_ID, SECOND_ROOM_TYPE_ID, 'B-202'),
    ]);

    await expect(
      service.checkIn(RESERVATION_ID, [FIRST_ROOM_ID, SECOND_ROOM_ID, THIRD_ROOM_ID]),
    ).rejects.toMatchObject({ response: { error: 'ROOM_ASSIGNMENT_UNAVAILABLE' } });
    expect(repository.findActiveAssignmentsByRoomIds).not.toHaveBeenCalled();
  });

  it('rejects a Room with an existing active assignment', async () => {
    repository.findActiveAssignmentsByRoomIds.mockResolvedValue([
      Object.assign(new RoomAssignment(), {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        reservationItemId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        roomId: FIRST_ROOM_ID,
        assignedAt: CREATED_AT,
        releasedAt: null,
      }),
    ]);

    await expect(
      service.checkIn(RESERVATION_ID, [FIRST_ROOM_ID, SECOND_ROOM_ID, THIRD_ROOM_ID]),
    ).rejects.toMatchObject({ response: { error: 'ROOM_ASSIGNMENT_UNAVAILABLE' } });
    expect(repository.saveRoomAssignments).not.toHaveBeenCalled();
  });

  it('maps the active assignment unique-index race to the assignment conflict', async () => {
    repository.saveRoomAssignments.mockRejectedValue({
      driverError: { code: '23505', constraint: 'uq_room_assignments_active_room' },
    });

    await expect(
      service.checkIn(RESERVATION_ID, [FIRST_ROOM_ID, SECOND_ROOM_ID, THIRD_ROOM_ID]),
    ).rejects.toMatchObject({ response: { error: 'ROOM_ASSIGNMENT_UNAVAILABLE' } });
    expect(repository.saveReservation).not.toHaveBeenCalled();
  });
});
