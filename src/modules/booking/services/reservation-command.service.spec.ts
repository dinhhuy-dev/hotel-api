import type { PricingQuoteContract } from '../../pricing/contracts/pricing-quote.contract';
import type {
  BookingAvailabilityRoomType,
  BookingRoomCatalogService,
} from '../../room-catalog/contracts/booking-room-catalog.contract';
import type { DataSource, EntityManager } from 'typeorm';
import type { BookingClock } from '../contracts/booking-clock.contract';
import type {
  CustomerCreateReservationDto,
  ReceptionistCreateReservationDto,
} from '../dto/create-reservation.dto';
import { CancellationReason } from '../entities/enum/cancellation-reason';
import { PaymentStatus } from '../entities/enum/payment-status';
import { ReservationStatus } from '../entities/enum/reservation-status';
import { ReservationItem } from '../entities/reservation-item.entity';
import { Reservation } from '../entities/reservation.entity';
import type { BookingRepositoryPort } from '../repositories/ports/booking-repository.port';
import { ReservationCommandService } from './reservation-command.service';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_CUSTOMER_ID = '22222222-2222-4222-8222-222222222222';
const FIRST_ROOM_TYPE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SECOND_ROOM_TYPE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RESERVATION_ID = '33333333-3333-4333-8333-333333333333';
const IDEMPOTENCY_KEY = '44444444-4444-4444-8444-444444444444';
const NOW = new Date('2026-08-24T01:00:00.000Z');
const CREATED_AT = new Date('2026-08-24T01:00:00.000Z');

type CommandRepository = Pick<
  BookingRepositoryPort,
  | 'findByIdempotencyKey'
  | 'findWithDetailsById'
  | 'findAndLockById'
  | 'findCommittedQuantities'
  | 'saveReservation'
  | 'saveReservationItems'
>;

function createDto(
  overrides: Partial<CustomerCreateReservationDto> = {},
): CustomerCreateReservationDto {
  return {
    contactName: 'Nguyen Van An',
    contactPhone: '+84901234567',
    checkInDate: '2026-09-01',
    checkOutDate: '2026-09-04',
    guestCount: 3,
    items: [
      { roomTypeId: SECOND_ROOM_TYPE_ID, quantity: 1 },
      { roomTypeId: FIRST_ROOM_TYPE_ID, quantity: 1 },
    ],
    ...overrides,
  };
}

function createRoomType(
  id: string,
  overrides: Partial<BookingAvailabilityRoomType> = {},
): BookingAvailabilityRoomType {
  return {
    id,
    name: `Room Type ${id[0]}`,
    description: null,
    maxOccupancy: 2,
    sellableRoomCount: 3,
    facilities: [],
    ...overrides,
  };
}

function createReservation(overrides: Partial<Reservation> = {}): Reservation {
  const firstItem = Object.assign(new ReservationItem(), {
    id: '55555555-5555-4555-8555-555555555555',
    reservationId: RESERVATION_ID,
    roomTypeId: FIRST_ROOM_TYPE_ID,
    quantity: 1,
    totalPrice: 300000,
    assignments: [],
  });

  return Object.assign(new Reservation(), {
    id: RESERVATION_ID,
    customerId: ACCOUNT_ID,
    contactName: 'Stored Contact',
    contactPhone: '+84987654321',
    checkInDate: '2026-09-01',
    checkOutDate: '2026-09-04',
    guestCount: 2,
    status: ReservationStatus.Pending,
    totalAmount: 300000,
    expiresAt: new Date('2026-08-24T01:15:00.000Z'),
    paymentStatus: PaymentStatus.Unpaid,
    chargeRequestId: null,
    chargeReference: null,
    refundRequestId: null,
    refundReference: null,
    idempotencyKey: IDEMPOTENCY_KEY,
    cancellationReason: null,
    checkedInAt: null,
    checkedOutAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    items: [firstItem],
    ...overrides,
  });
}

describe('ReservationCommandService', () => {
  let service: ReservationCommandService;
  let roomCatalogService: jest.Mocked<Pick<BookingRoomCatalogService, 'findAvailabilityRoomTypes'>>;
  let repository: jest.Mocked<CommandRepository>;
  let pricingQuoteService: jest.Mocked<Pick<PricingQuoteContract, 'quote'>>;
  let clock: jest.Mocked<BookingClock>;
  let manager: EntityManager;
  let rootManager: EntityManager;
  let transaction: jest.Mock;

  beforeEach(() => {
    manager = { queryRunner: { data: 'transaction-manager' } } as unknown as EntityManager;
    rootManager = { queryRunner: { data: 'root-manager' } } as unknown as EntityManager;
    roomCatalogService = {
      findAvailabilityRoomTypes: jest
        .fn()
        .mockResolvedValue([
          createRoomType(SECOND_ROOM_TYPE_ID),
          createRoomType(FIRST_ROOM_TYPE_ID),
        ]),
    };
    repository = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      findWithDetailsById: jest.fn().mockResolvedValue(null),
      findAndLockById: jest.fn().mockResolvedValue(null),
      findCommittedQuantities: jest.fn().mockResolvedValue([]),
      saveReservation: jest.fn().mockImplementation((reservation: Reservation) => {
        reservation.id = RESERVATION_ID;
        reservation.createdAt = CREATED_AT;
        reservation.updatedAt = CREATED_AT;
        return Promise.resolve(reservation);
      }),
      saveReservationItems: jest.fn().mockImplementation((items: readonly ReservationItem[]) =>
        Promise.resolve(
          items.map((item, index) => {
            item.id = `66666666-6666-4666-8666-${String(index + 1).padStart(12, '0')}`;
            return item;
          }),
        ),
      ),
    };
    pricingQuoteService = {
      quote: jest.fn().mockResolvedValue({
        quotes: [
          { roomTypeId: SECOND_ROOM_TYPE_ID, pricePerRoomStay: 600000, appliedRates: [] },
          { roomTypeId: FIRST_ROOM_TYPE_ID, pricePerRoomStay: 300000, appliedRates: [] },
        ],
        unquotedRoomTypeIds: [],
      }),
    };
    clock = {
      now: jest.fn().mockReturnValue(NOW),
      today: jest.fn().mockReturnValue('2026-08-24'),
    };
    transaction = jest
      .fn()
      .mockImplementation((work: (transactionManager: EntityManager) => unknown) =>
        Promise.resolve(work(manager)),
      );
    service = new ReservationCommandService(
      roomCatalogService,
      repository,
      pricingQuoteService,
      clock,
      { manager: rootManager, transaction } as unknown as DataSource,
    );
  });

  it('creates a Customer Reservation with sorted locks, one manager, and immutable snapshots', async () => {
    const result = await service.createForCustomer(ACCOUNT_ID, IDEMPOTENCY_KEY, createDto());

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(repository.findByIdempotencyKey).toHaveBeenCalledWith(IDEMPOTENCY_KEY, manager);
    expect(roomCatalogService.findAvailabilityRoomTypes).toHaveBeenCalledWith(
      {
        roomTypeIds: [FIRST_ROOM_TYPE_ID, SECOND_ROOM_TYPE_ID],
        lockForUpdate: true,
      },
      manager,
    );
    expect(repository.findCommittedQuantities).toHaveBeenCalledWith(
      [FIRST_ROOM_TYPE_ID, SECOND_ROOM_TYPE_ID],
      '2026-09-01',
      '2026-09-04',
      NOW,
      manager,
    );
    expect(pricingQuoteService.quote).toHaveBeenCalledWith(
      {
        roomTypeIds: [FIRST_ROOM_TYPE_ID, SECOND_ROOM_TYPE_ID],
        checkInDate: '2026-09-01',
        checkOutDate: '2026-09-04',
      },
      manager,
    );

    const savedReservation = repository.saveReservation.mock.calls[0][0];
    expect(savedReservation).toMatchObject({
      customerId: ACCOUNT_ID,
      contactName: 'Nguyen Van An',
      contactPhone: '+84901234567',
      checkInDate: '2026-09-01',
      checkOutDate: '2026-09-04',
      guestCount: 3,
      status: ReservationStatus.Pending,
      totalAmount: 900000,
      expiresAt: new Date('2026-08-24T01:15:00.000Z'),
      paymentStatus: PaymentStatus.Unpaid,
      idempotencyKey: IDEMPOTENCY_KEY,
      cancellationReason: null,
    });
    expect(repository.saveReservationItems.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        reservationId: RESERVATION_ID,
        roomTypeId: FIRST_ROOM_TYPE_ID,
        quantity: 1,
        totalPrice: 300000,
      }),
      expect.objectContaining({
        reservationId: RESERVATION_ID,
        roomTypeId: SECOND_ROOM_TYPE_ID,
        quantity: 1,
        totalPrice: 600000,
      }),
    ]);
    expect(result).toMatchObject({
      id: RESERVATION_ID,
      customerId: ACCOUNT_ID,
      status: ReservationStatus.Pending,
      totalAmount: 900000,
      expiresAt: '2026-08-24T01:15:00.000Z',
      createdAt: CREATED_AT.toISOString(),
      items: [
        { roomTypeId: FIRST_ROOM_TYPE_ID, quantity: 1, totalPrice: 300000 },
        { roomTypeId: SECOND_ROOM_TYPE_ID, quantity: 1, totalPrice: 600000 },
      ],
      assignments: [],
    });
    expect(result).not.toHaveProperty('idempotencyKey');
    expect(result).not.toHaveProperty('chargeRequestId');
    expect(result).not.toHaveProperty('chargeReference');
    expect(result).not.toHaveProperty('refundRequestId');
    expect(result).not.toHaveProperty('refundReference');
  });

  it('creates a Receptionist Reservation for the supplied Customer', async () => {
    const dto: ReceptionistCreateReservationDto = {
      ...createDto({ items: [{ roomTypeId: FIRST_ROOM_TYPE_ID, quantity: 2 }] }),
      customerId: OTHER_CUSTOMER_ID,
    };
    roomCatalogService.findAvailabilityRoomTypes.mockResolvedValue([
      createRoomType(FIRST_ROOM_TYPE_ID),
    ]);
    pricingQuoteService.quote.mockResolvedValue({
      quotes: [{ roomTypeId: FIRST_ROOM_TYPE_ID, pricePerRoomStay: 300000, appliedRates: [] }],
      unquotedRoomTypeIds: [],
    });

    const result = await service.createForReceptionist(IDEMPOTENCY_KEY, dto);

    expect(result.customerId).toBe(OTHER_CUSTOMER_ID);
    expect(repository.saveReservation.mock.calls[0][0].customerId).toBe(OTHER_CUSTOMER_ID);
    expect(result.totalAmount).toBe(600000);
  });

  it('starts the full pending hold after the Room Type lock is acquired', async () => {
    const afterLock = new Date('2026-08-24T01:10:00.000Z');
    roomCatalogService.findAvailabilityRoomTypes.mockImplementation(() => {
      clock.now.mockReturnValue(afterLock);
      return Promise.resolve([
        createRoomType(FIRST_ROOM_TYPE_ID),
        createRoomType(SECOND_ROOM_TYPE_ID),
      ]);
    });

    await service.createForCustomer(ACCOUNT_ID, IDEMPOTENCY_KEY, createDto());

    expect(repository.findCommittedQuantities).toHaveBeenCalledWith(
      [FIRST_ROOM_TYPE_ID, SECOND_ROOM_TYPE_ID],
      '2026-09-01',
      '2026-09-04',
      afterLock,
      manager,
    );
    expect(repository.saveReservation.mock.calls[0][0].expiresAt).toEqual(
      new Date('2026-08-24T01:25:00.000Z'),
    );
  });

  it.each([
    [
      'duplicate Room Type items',
      createDto({
        items: [
          { roomTypeId: FIRST_ROOM_TYPE_ID, quantity: 1 },
          { roomTypeId: FIRST_ROOM_TYPE_ID, quantity: 1 },
        ],
      }),
    ],
    [
      'a total room quantity above five',
      createDto({
        items: [
          { roomTypeId: FIRST_ROOM_TYPE_ID, quantity: 3 },
          { roomTypeId: SECOND_ROOM_TYPE_ID, quantity: 3 },
        ],
      }),
    ],
  ])('rejects %s as a cross-item request error', async (_case, dto) => {
    await expect(service.createForCustomer(ACCOUNT_ID, IDEMPOTENCY_KEY, dto)).rejects.toMatchObject(
      { response: { error: 'INVALID_RESERVATION_REQUEST' } },
    );
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(repository.findByIdempotencyKey).toHaveBeenCalledWith(IDEMPOTENCY_KEY, manager);
    expect(roomCatalogService.findAvailabilityRoomTypes).not.toHaveBeenCalled();
  });

  it.each([
    ['a past check-in', { checkInDate: '2026-08-23' }],
    ['check-out equal to check-in', { checkOutDate: '2026-09-01' }],
    ['check-out before check-in', { checkOutDate: '2026-08-31' }],
    ['a stay above 30 nights', { checkOutDate: '2026-10-02' }],
  ])('rejects %s before locking Room Types', async (_case, overrides) => {
    await expect(
      service.createForCustomer(ACCOUNT_ID, IDEMPOTENCY_KEY, createDto(overrides)),
    ).rejects.toMatchObject({ response: { error: 'INVALID_RESERVATION_RANGE' } });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(repository.findByIdempotencyKey).toHaveBeenCalledWith(IDEMPOTENCY_KEY, manager);
    expect(roomCatalogService.findAvailabilityRoomTypes).not.toHaveBeenCalled();
  });

  it('rejects a selected room combination with insufficient guest capacity', async () => {
    roomCatalogService.findAvailabilityRoomTypes.mockResolvedValue([
      createRoomType(FIRST_ROOM_TYPE_ID, { maxOccupancy: 1 }),
      createRoomType(SECOND_ROOM_TYPE_ID, { maxOccupancy: 1 }),
    ]);

    await expect(
      service.createForCustomer(ACCOUNT_ID, IDEMPOTENCY_KEY, createDto({ guestCount: 3 })),
    ).rejects.toMatchObject({ response: { error: 'INVALID_RESERVATION_REQUEST' } });
    expect(repository.findCommittedQuantities).not.toHaveBeenCalled();
    expect(pricingQuoteService.quote).not.toHaveBeenCalled();
  });

  it('rejects a missing or inactive requested Room Type', async () => {
    roomCatalogService.findAvailabilityRoomTypes.mockResolvedValue([
      createRoomType(FIRST_ROOM_TYPE_ID),
    ]);

    await expect(
      service.createForCustomer(ACCOUNT_ID, IDEMPOTENCY_KEY, createDto()),
    ).rejects.toMatchObject({ response: { error: 'ROOM_TYPE_UNAVAILABLE' } });
    expect(repository.findCommittedQuantities).not.toHaveBeenCalled();
  });

  it('rejects a commitment conflict after locked capacity is rechecked', async () => {
    repository.findCommittedQuantities.mockResolvedValue([
      { roomTypeId: FIRST_ROOM_TYPE_ID, quantity: 3 },
    ]);

    await expect(
      service.createForCustomer(ACCOUNT_ID, IDEMPOTENCY_KEY, createDto()),
    ).rejects.toMatchObject({ response: { error: 'ROOM_AVAILABILITY_CONFLICT' } });
    expect(pricingQuoteService.quote).not.toHaveBeenCalled();
    expect(repository.saveReservation).not.toHaveBeenCalled();
  });

  it.each([
    [
      'incomplete coverage',
      {
        quotes: [{ roomTypeId: FIRST_ROOM_TYPE_ID, pricePerRoomStay: 300000, appliedRates: [] }],
        unquotedRoomTypeIds: [SECOND_ROOM_TYPE_ID],
      },
    ],
    [
      'an unsafe accepted total',
      {
        quotes: [
          {
            roomTypeId: FIRST_ROOM_TYPE_ID,
            pricePerRoomStay: Number.MAX_SAFE_INTEGER,
            appliedRates: [],
          },
          { roomTypeId: SECOND_ROOM_TYPE_ID, pricePerRoomStay: 600000, appliedRates: [] },
        ],
        unquotedRoomTypeIds: [],
      },
    ],
    [
      'a total above the PostgreSQL integer range',
      {
        quotes: [
          { roomTypeId: FIRST_ROOM_TYPE_ID, pricePerRoomStay: 1_600_000_000, appliedRates: [] },
          { roomTypeId: SECOND_ROOM_TYPE_ID, pricePerRoomStay: 600_000_000, appliedRates: [] },
        ],
        unquotedRoomTypeIds: [],
      },
    ],
  ])('rejects Pricing with %s', async (_case, pricing) => {
    pricingQuoteService.quote.mockResolvedValue(pricing);

    await expect(
      service.createForCustomer(ACCOUNT_ID, IDEMPOTENCY_KEY, createDto()),
    ).rejects.toMatchObject({ response: { error: 'PRICING_UNAVAILABLE' } });
    expect(repository.saveReservation).not.toHaveBeenCalled();
  });

  it('replays an owned global idempotency key without repeating inventory work', async () => {
    const existing = createReservation();
    repository.findByIdempotencyKey.mockResolvedValue(existing);

    const result = await service.createForCustomer(
      ACCOUNT_ID,
      IDEMPOTENCY_KEY,
      createDto({
        contactName: 'A different payload is not compared',
        items: [
          { roomTypeId: FIRST_ROOM_TYPE_ID, quantity: 3 },
          { roomTypeId: FIRST_ROOM_TYPE_ID, quantity: 3 },
        ],
      }),
    );

    expect(result.id).toBe(RESERVATION_ID);
    expect(result.contactName).toBe('Stored Contact');
    expect(roomCatalogService.findAvailabilityRoomTypes).not.toHaveBeenCalled();
    expect(repository.findAndLockById).not.toHaveBeenCalled();
    expect(repository.saveReservation).not.toHaveBeenCalled();
  });

  it('rejects a Customer replay when the global key belongs to another Customer', async () => {
    repository.findByIdempotencyKey.mockResolvedValue(
      createReservation({ customerId: OTHER_CUSTOMER_ID }),
    );

    await expect(
      service.createForCustomer(ACCOUNT_ID, IDEMPOTENCY_KEY, createDto()),
    ).rejects.toMatchObject({ response: { error: 'IDEMPOTENCY_KEY_REUSED' } });
    expect(roomCatalogService.findAvailabilityRoomTypes).not.toHaveBeenCalled();
  });

  it('allows a Receptionist to replay a global key regardless of the supplied Customer', async () => {
    repository.findByIdempotencyKey.mockResolvedValue(createReservation());
    const dto: ReceptionistCreateReservationDto = {
      ...createDto(),
      customerId: OTHER_CUSTOMER_ID,
    };

    const result = await service.createForReceptionist(IDEMPOTENCY_KEY, dto);

    expect(result.customerId).toBe(ACCOUNT_ID);
    expect(repository.saveReservation).not.toHaveBeenCalled();
  });

  it('lazily expires a replayed pending hold under a Reservation row lock', async () => {
    const existing = createReservation({ expiresAt: new Date(NOW) });
    const locked = createReservation({ expiresAt: new Date(NOW) });
    repository.findByIdempotencyKey.mockResolvedValue(existing);
    repository.findAndLockById.mockResolvedValue(locked);
    repository.findWithDetailsById.mockResolvedValue(locked);

    const result = await service.createForCustomer(ACCOUNT_ID, IDEMPOTENCY_KEY, createDto());

    expect(repository.findAndLockById).toHaveBeenCalledWith(RESERVATION_ID, manager);
    expect(repository.saveReservation).toHaveBeenCalledWith(locked, manager);
    expect(locked.status).toBe(ReservationStatus.Cancelled);
    expect(locked.cancellationReason).toBe(CancellationReason.PaymentTimeout);
    expect(result).toMatchObject({
      status: ReservationStatus.Cancelled,
      cancellationReason: CancellationReason.PaymentTimeout,
    });
    expect(roomCatalogService.findAvailabilityRoomTypes).not.toHaveBeenCalled();
  });

  it('converts an idempotency unique race into a safe replay', async () => {
    const existing = createReservation();
    const uniqueError = {
      driverError: { code: '23505', constraint: 'uq_reservations_idempotency_key' },
    };
    transaction.mockRejectedValueOnce(uniqueError);
    repository.findByIdempotencyKey.mockResolvedValue(existing);

    const result = await service.createForCustomer(ACCOUNT_ID, IDEMPOTENCY_KEY, createDto());

    expect(result.id).toBe(RESERVATION_ID);
    expect(repository.findByIdempotencyKey).toHaveBeenCalledWith(IDEMPOTENCY_KEY, rootManager);
  });
});
