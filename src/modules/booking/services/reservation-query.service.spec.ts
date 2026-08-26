import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import type { BookingRoomCatalogService } from '../../room-catalog/contracts/booking-room-catalog.contract';
import type { DataSource, EntityManager } from 'typeorm';
import type { BookingClock } from '../contracts/booking-clock.contract';
import {
  CustomerReservationQueryDto,
  StaffReservationQueryDto,
} from '../dto/reservation-query.dto';
import { CancellationReason } from '../entities/enum/cancellation-reason';
import { PaymentStatus } from '../entities/enum/payment-status';
import { ReservationStatus } from '../entities/enum/reservation-status';
import { ReservationItem } from '../entities/reservation-item.entity';
import { Reservation } from '../entities/reservation.entity';
import { RoomAssignment } from '../entities/room-assignment.entity';
import type { BookingRepositoryPort } from '../repositories/ports/booking-repository.port';
import { ReservationQueryService } from './reservation-query.service';

const RESERVATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SECOND_RESERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CUSTOMER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OTHER_CUSTOMER_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ROOM_TYPE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ROOM_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_ROOM_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-01T03:00:00.000Z');

function createReservation(overrides: Partial<Reservation> = {}): Reservation {
  return Object.assign(new Reservation(), {
    id: RESERVATION_ID,
    customerId: CUSTOMER_ID,
    contactName: 'Alex Nguyen',
    contactPhone: '+84901234567',
    checkInDate: '2026-09-05',
    checkOutDate: '2026-09-08',
    guestCount: 2,
    status: ReservationStatus.Confirmed,
    totalAmount: 900000,
    expiresAt: new Date('2026-09-01T02:00:00.000Z'),
    paymentStatus: PaymentStatus.Paid,
    chargeRequestId: null,
    chargeReference: 'charge-reference',
    refundRequestId: null,
    refundReference: null,
    idempotencyKey: '33333333-3333-4333-8333-333333333333',
    cancellationReason: null,
    checkedInAt: null,
    checkedOutAt: null,
    createdAt: new Date('2026-08-31T04:00:00.000Z'),
    updatedAt: new Date('2026-08-31T04:00:00.000Z'),
    items: [],
    ...overrides,
  });
}

function createItemWithAssignments(roomIds: readonly string[]): ReservationItem {
  const item = Object.assign(new ReservationItem(), {
    id: '44444444-4444-4444-8444-444444444444',
    reservationId: RESERVATION_ID,
    roomTypeId: ROOM_TYPE_ID,
    quantity: roomIds.length,
    totalPrice: 900000,
  });
  item.assignments = roomIds.map((roomId, index) =>
    Object.assign(new RoomAssignment(), {
      id: `55555555-5555-4555-8555-${String(index + 1).padStart(12, '0')}`,
      reservationItemId: item.id,
      roomId,
      assignedAt: new Date('2026-09-05T07:00:00.000Z'),
      releasedAt: null,
    }),
  );

  return item;
}

describe('ReservationQueryService', () => {
  let service: ReservationQueryService;
  let repository: jest.Mocked<
    Pick<
      BookingRepositoryPort,
      | 'findPage'
      | 'findExpiredPendingIds'
      | 'findWithDetailsById'
      | 'findAndLockById'
      | 'saveReservation'
    >
  >;
  let roomCatalogService: jest.Mocked<Pick<BookingRoomCatalogService, 'findRoomsForAssignment'>>;
  let clock: jest.Mocked<BookingClock>;
  let manager: EntityManager;
  let transaction: jest.Mock;

  beforeEach(() => {
    repository = {
      findPage: jest.fn(),
      findExpiredPendingIds: jest.fn().mockResolvedValue([]),
      findWithDetailsById: jest.fn(),
      findAndLockById: jest.fn(),
      saveReservation: jest.fn(),
    };
    roomCatalogService = {
      findRoomsForAssignment: jest.fn().mockResolvedValue([]),
    };
    clock = {
      now: jest.fn().mockReturnValue(NOW),
      today: jest.fn().mockReturnValue('2026-09-01'),
    };
    manager = {} as EntityManager;
    transaction = jest.fn((work: (transactionManager: EntityManager) => unknown) => work(manager));
    service = new ReservationQueryService(repository, roomCatalogService, clock, {
      transaction,
    } as unknown as DataSource);
  });

  it('lists only owned Reservations with exact filters and pagination', async () => {
    const reservation = createReservation();
    const dto = Object.assign(new CustomerReservationQueryDto(), {
      page: 2,
      limit: 5,
      status: ReservationStatus.Confirmed,
    });
    repository.findPage.mockResolvedValue({ items: [reservation], totalItems: 8 });

    const result = await service.listForCustomer(CUSTOMER_ID, dto);

    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: RESERVATION_ID,
      customerId: CUSTOMER_ID,
      status: ReservationStatus.Confirmed,
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 5,
      totalItems: 8,
      totalPages: 2,
    });
    expect(repository.findPage).toHaveBeenCalledWith(
      {
        page: 2,
        limit: 5,
        customerId: CUSTOMER_ID,
        status: ReservationStatus.Confirmed,
      },
      manager,
    );
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(repository.findAndLockById).not.toHaveBeenCalled();
  });

  it('forwards every staff filter to the repository', async () => {
    const dto = Object.assign(new StaffReservationQueryDto(), {
      page: 3,
      limit: 10,
      customerId: CUSTOMER_ID,
      status: ReservationStatus.Cancelled,
      checkInDate: '2026-09-05',
      checkOutDate: '2026-09-08',
    });
    repository.findPage.mockResolvedValue({ items: [], totalItems: 21 });

    const result = await service.listForStaff(dto);

    expect(repository.findPage).toHaveBeenCalledWith(
      {
        page: 3,
        limit: 10,
        customerId: CUSTOMER_ID,
        status: ReservationStatus.Cancelled,
        checkInDate: '2026-09-05',
        checkOutDate: '2026-09-08',
      },
      manager,
    );
    expect(result.pagination).toEqual({
      page: 3,
      pageSize: 10,
      totalItems: 21,
      totalPages: 3,
    });
  });

  it('hides a Reservation owned by another Customer', async () => {
    repository.findWithDetailsById.mockResolvedValue(createReservation());

    await expect(
      service.findOneForCustomer(OTHER_CUSTOMER_ID, RESERVATION_ID),
    ).rejects.toMatchObject({
      response: { error: 'RESERVATION_NOT_FOUND' },
    });
    expect(repository.findWithDetailsById).toHaveBeenCalledWith(RESERVATION_ID, manager);
    expect(repository.findAndLockById).not.toHaveBeenCalled();
    expect(roomCatalogService.findRoomsForAssignment).not.toHaveBeenCalled();
  });

  it.each([
    ['Customer detail', () => service.findOneForCustomer(CUSTOMER_ID, RESERVATION_ID)],
    ['staff detail', () => service.findOneForStaff(RESERVATION_ID)],
  ])('returns RESERVATION_NOT_FOUND for missing %s', async (_case, query) => {
    repository.findWithDetailsById.mockResolvedValue(null);

    await expect(query()).rejects.toMatchObject({
      response: { error: 'RESERVATION_NOT_FOUND' },
    });
    expect(repository.findWithDetailsById).toHaveBeenCalledWith(RESERVATION_ID, manager);
  });

  it('locks, rechecks, and saves an expired pending Reservation as PAYMENT_TIMEOUT', async () => {
    const reservation = createReservation({
      status: ReservationStatus.Pending,
      paymentStatus: PaymentStatus.Unpaid,
      chargeReference: null,
      expiresAt: new Date(NOW),
    });
    const lockedReservation = createReservation({
      status: ReservationStatus.Pending,
      paymentStatus: PaymentStatus.Unpaid,
      chargeReference: null,
      expiresAt: new Date(NOW),
      items: [],
    });
    repository.findWithDetailsById.mockResolvedValue(reservation);
    repository.findAndLockById.mockResolvedValue(lockedReservation);
    repository.saveReservation.mockImplementation((current) => {
      current.updatedAt = new Date('2026-09-01T03:00:01.000Z');
      return Promise.resolve(current);
    });

    const result = await service.findOneForStaff(RESERVATION_ID);

    expect(repository.findAndLockById).toHaveBeenCalledWith(RESERVATION_ID, manager);
    expect(repository.saveReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: RESERVATION_ID,
        status: ReservationStatus.Cancelled,
        cancellationReason: CancellationReason.PaymentTimeout,
      }),
      manager,
    );
    expect(result).toMatchObject({
      status: ReservationStatus.Cancelled,
      cancellationReason: CancellationReason.PaymentTimeout,
      updatedAt: '2026-09-01T03:00:01.000Z',
    });
  });

  it('uses the locked lifecycle state when expiration loses a race', async () => {
    repository.findWithDetailsById.mockResolvedValue(
      createReservation({
        status: ReservationStatus.Pending,
        paymentStatus: PaymentStatus.Unpaid,
        chargeReference: null,
        expiresAt: new Date(NOW),
      }),
    );
    repository.findAndLockById.mockResolvedValue(
      createReservation({ status: ReservationStatus.Confirmed }),
    );

    const result = await service.findOneForStaff(RESERVATION_ID);

    expect(result.status).toBe(ReservationStatus.Confirmed);
    expect(repository.saveReservation).not.toHaveBeenCalled();
  });

  it('locks expired Reservations in identifier order when materializing a page', async () => {
    const first = createReservation({
      id: RESERVATION_ID,
      status: ReservationStatus.Pending,
      paymentStatus: PaymentStatus.Unpaid,
      chargeReference: null,
      expiresAt: new Date(NOW),
    });
    const second = createReservation({
      id: SECOND_RESERVATION_ID,
      status: ReservationStatus.Pending,
      paymentStatus: PaymentStatus.Unpaid,
      chargeReference: null,
      expiresAt: new Date(NOW),
    });
    repository.findPage.mockResolvedValue({ items: [second, first], totalItems: 2 });
    repository.findExpiredPendingIds.mockResolvedValue([SECOND_RESERVATION_ID, RESERVATION_ID]);
    repository.findAndLockById.mockImplementation((id) =>
      Promise.resolve(
        createReservation({
          id,
          status: ReservationStatus.Pending,
          paymentStatus: PaymentStatus.Unpaid,
          chargeReference: null,
          expiresAt: new Date(NOW),
        }),
      ),
    );
    repository.saveReservation.mockImplementation((reservation) => Promise.resolve(reservation));

    await service.listForStaff(new StaffReservationQueryDto());

    expect(repository.findAndLockById.mock.calls.map(([id]) => id)).toEqual([
      RESERVATION_ID,
      SECOND_RESERVATION_ID,
    ]);
    expect(repository.saveReservation).toHaveBeenCalledTimes(2);
  });

  it('materializes expiration before applying a status filter and counting the page', async () => {
    const expired = createReservation({
      status: ReservationStatus.Pending,
      paymentStatus: PaymentStatus.Unpaid,
      chargeReference: null,
      expiresAt: new Date(NOW),
    });
    repository.findExpiredPendingIds.mockResolvedValue([RESERVATION_ID]);
    repository.findAndLockById.mockResolvedValue(expired);
    repository.saveReservation.mockResolvedValue(expired);
    repository.findPage.mockResolvedValue({ items: [], totalItems: 0 });
    const dto = Object.assign(new CustomerReservationQueryDto(), {
      status: ReservationStatus.Pending,
    });

    const result = await service.listForCustomer(CUSTOMER_ID, dto);

    expect(repository.findExpiredPendingIds).toHaveBeenCalledWith(
      { customerId: CUSTOMER_ID, now: NOW },
      manager,
    );
    expect(repository.findPage).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: CUSTOMER_ID, status: ReservationStatus.Pending }),
      manager,
    );
    expect(repository.findExpiredPendingIds.mock.invocationCallOrder[0]).toBeLessThan(
      repository.findPage.mock.invocationCallOrder[0],
    );
    expect(result.pagination).toMatchObject({ totalItems: 0, totalPages: 0 });
  });

  it('does not lock a pending Reservation before its expiration time', async () => {
    repository.findWithDetailsById.mockResolvedValue(
      createReservation({
        status: ReservationStatus.Pending,
        paymentStatus: PaymentStatus.Unpaid,
        chargeReference: null,
        expiresAt: new Date('2026-09-01T03:00:00.001Z'),
      }),
    );

    const result = await service.findOneForCustomer(CUSTOMER_ID, RESERVATION_ID);

    expect(result.status).toBe(ReservationStatus.Pending);
    expect(repository.findAndLockById).not.toHaveBeenCalled();
    expect(repository.saveReservation).not.toHaveBeenCalled();
  });

  it('loads assignment room numbers once in sorted order with the transaction manager', async () => {
    const reservation = createReservation({
      items: [createItemWithAssignments([SECOND_ROOM_ID, ROOM_ID])],
    });
    repository.findWithDetailsById.mockResolvedValue(reservation);
    roomCatalogService.findRoomsForAssignment.mockResolvedValue([
      {
        id: ROOM_ID,
        roomTypeId: ROOM_TYPE_ID,
        roomNumber: 'A-101',
        operationalStatus: 'READY',
      },
      {
        id: SECOND_ROOM_ID,
        roomTypeId: ROOM_TYPE_ID,
        roomNumber: 'A-102',
        operationalStatus: 'READY',
      },
    ]);

    const result = await service.findOneForStaff(RESERVATION_ID);

    expect(roomCatalogService.findRoomsForAssignment).toHaveBeenCalledWith(
      { roomIds: [ROOM_ID, SECOND_ROOM_ID], lockForUpdate: false },
      manager,
    );
    expect(result.assignments).toEqual([
      expect.objectContaining({ roomId: ROOM_ID, roomNumber: 'A-101' }),
      expect.objectContaining({ roomId: SECOND_ROOM_ID, roomNumber: 'A-102' }),
    ]);
  });
});
