import type { DataSource, EntityManager } from 'typeorm';
import type { BookingClock } from '../contracts/booking-clock.contract';
import { CancellationReason } from '../entities/enum/cancellation-reason';
import { PaymentStatus } from '../entities/enum/payment-status';
import { ReservationStatus } from '../entities/enum/reservation-status';
import { Reservation } from '../entities/reservation.entity';
import type { BookingEventBus } from '../events/booking-event-bus';
import type { PaymentSucceededEvent, RefundSucceededEvent } from '../events/booking-event';
import type { BookingRepositoryPort } from '../repositories/ports/booking-repository.port';
import { PaymentEventService } from './payment-event.service';

const RESERVATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CHARGE_REQUEST_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const REFUND_REQUEST_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TOTAL_AMOUNT = 900000;
const NOW = new Date('2026-09-01T03:00:00.000Z');

const PAYMENT_SUCCEEDED: PaymentSucceededEvent = {
  type: 'PaymentSucceeded',
  reservationId: RESERVATION_ID,
  requestId: CHARGE_REQUEST_ID,
  amount: TOTAL_AMOUNT,
  reference: 'mock-charge-reference',
};

const REFUND_SUCCEEDED: RefundSucceededEvent = {
  type: 'RefundSucceeded',
  reservationId: RESERVATION_ID,
  requestId: REFUND_REQUEST_ID,
  amount: TOTAL_AMOUNT,
  reference: 'mock-refund-reference',
};

function createReservation(overrides: Partial<Reservation> = {}): Reservation {
  return Object.assign(new Reservation(), {
    id: RESERVATION_ID,
    status: ReservationStatus.Pending,
    totalAmount: TOTAL_AMOUNT,
    expiresAt: new Date('2026-09-01T03:00:00.001Z'),
    paymentStatus: PaymentStatus.Unpaid,
    chargeRequestId: CHARGE_REQUEST_ID,
    chargeReference: null,
    refundRequestId: null,
    refundReference: null,
    cancellationReason: null,
    ...overrides,
  });
}

describe('PaymentEventService', () => {
  let service: PaymentEventService;
  let repository: jest.Mocked<Pick<BookingRepositoryPort, 'findAndLockById' | 'saveReservation'>>;
  let clock: jest.Mocked<BookingClock>;
  let manager: EntityManager;
  let subscribe: jest.Mock;
  let publish: jest.Mock;
  let transaction: jest.Mock;
  let callOrder: string[];
  let paymentSucceededHandler: ((event: PaymentSucceededEvent) => Promise<void> | void) | undefined;
  let refundSucceededHandler: ((event: RefundSucceededEvent) => Promise<void> | void) | undefined;

  beforeEach(() => {
    repository = {
      findAndLockById: jest.fn(),
      saveReservation: jest.fn((reservation) => Promise.resolve(reservation)),
    };
    clock = {
      now: jest.fn().mockReturnValue(NOW),
      today: jest.fn().mockReturnValue('2026-09-01'),
    };
    manager = {} as EntityManager;
    callOrder = [];
    paymentSucceededHandler = undefined;
    refundSucceededHandler = undefined;
    subscribe = jest.fn((type: string, handler: unknown) => {
      if (type === 'PaymentSucceeded') {
        paymentSucceededHandler = handler as (event: PaymentSucceededEvent) => Promise<void> | void;
      }

      if (type === 'RefundSucceeded') {
        refundSucceededHandler = handler as (event: RefundSucceededEvent) => Promise<void> | void;
      }
    });
    publish = jest.fn(() => callOrder.push('publish'));
    transaction = jest.fn(async (work: (transactionManager: EntityManager) => Promise<unknown>) => {
      const result = await work(manager);
      callOrder.push('commit');
      return result;
    });
    service = new PaymentEventService(
      { subscribe } as unknown as BookingEventBus,
      repository,
      clock,
      { publish },
      { transaction } as unknown as DataSource,
    );
  });

  function getPaymentSucceededHandler(): (event: PaymentSucceededEvent) => Promise<void> | void {
    service.onModuleInit();

    if (paymentSucceededHandler === undefined) {
      throw new Error('PaymentSucceeded handler was not subscribed.');
    }

    return paymentSucceededHandler;
  }

  function getRefundSucceededHandler(): (event: RefundSucceededEvent) => Promise<void> | void {
    service.onModuleInit();

    if (refundSucceededHandler === undefined) {
      throw new Error('RefundSucceeded handler was not subscribed.');
    }

    return refundSucceededHandler;
  }

  it('subscribes typed handlers for payment and refund success events', () => {
    service.onModuleInit();

    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenNthCalledWith(1, 'PaymentSucceeded', expect.any(Function));
    expect(subscribe).toHaveBeenNthCalledWith(2, 'RefundSucceeded', expect.any(Function));
  });

  it('confirms a matching unexpired pending Reservation', async () => {
    const reservation = createReservation();
    repository.findAndLockById.mockResolvedValue(reservation);

    await getPaymentSucceededHandler()(PAYMENT_SUCCEEDED);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(repository.findAndLockById).toHaveBeenCalledWith(RESERVATION_ID, manager);
    expect(repository.saveReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ReservationStatus.Confirmed,
        paymentStatus: PaymentStatus.Paid,
        chargeReference: 'mock-charge-reference',
      }),
      manager,
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a different charge request ID',
      createReservation({ chargeRequestId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }),
    ],
    ['a different amount', createReservation({ totalAmount: TOTAL_AMOUNT + 1 })],
    ['a missing Reservation', null],
    ['a non-payable lifecycle', createReservation({ status: ReservationStatus.CheckedIn })],
  ])('ignores payment success with %s', async (_case, reservation) => {
    repository.findAndLockById.mockResolvedValue(reservation);

    await getPaymentSucceededHandler()(PAYMENT_SUCCEEDED);

    expect(repository.saveReservation).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('idempotently ignores duplicate payment success', async () => {
    repository.findAndLockById.mockResolvedValue(
      createReservation({
        status: ReservationStatus.Confirmed,
        paymentStatus: PaymentStatus.Paid,
        chargeReference: 'existing-charge-reference',
      }),
    );

    await getPaymentSucceededHandler()(PAYMENT_SUCCEEDED);

    expect(repository.saveReservation).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('cancels an expired pending Reservation and requests a refund after commit', async () => {
    const reservation = createReservation({ expiresAt: new Date(NOW) });
    repository.findAndLockById.mockResolvedValue(reservation);

    await getPaymentSucceededHandler()(PAYMENT_SUCCEEDED);

    expect(repository.saveReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ReservationStatus.Cancelled,
        cancellationReason: CancellationReason.PaymentTimeout,
        paymentStatus: PaymentStatus.Paid,
        chargeReference: 'mock-charge-reference',
      }),
      manager,
    );
    expect(typeof reservation.refundRequestId).toBe('string');
    expect(publish).toHaveBeenCalledWith({
      type: 'RefundRequested',
      reservationId: RESERVATION_ID,
      requestId: reservation.refundRequestId,
      amount: TOTAL_AMOUNT,
    });
    expect(callOrder).toEqual(['commit', 'publish']);
  });

  it('keeps a cancelled lifecycle and reuses its refund request ID after late payment', async () => {
    const reservation = createReservation({
      status: ReservationStatus.Cancelled,
      cancellationReason: CancellationReason.CustomerRequest,
      refundRequestId: REFUND_REQUEST_ID,
    });
    repository.findAndLockById.mockResolvedValue(reservation);

    await getPaymentSucceededHandler()(PAYMENT_SUCCEEDED);

    expect(repository.saveReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ReservationStatus.Cancelled,
        cancellationReason: CancellationReason.CustomerRequest,
        paymentStatus: PaymentStatus.Paid,
        chargeReference: 'mock-charge-reference',
        refundRequestId: REFUND_REQUEST_ID,
      }),
      manager,
    );
    expect(publish).toHaveBeenCalledWith({
      type: 'RefundRequested',
      reservationId: RESERVATION_ID,
      requestId: REFUND_REQUEST_ID,
      amount: TOTAL_AMOUNT,
    });
    expect(callOrder).toEqual(['commit', 'publish']);
  });

  it('applies matching refund success without changing the cancelled lifecycle', async () => {
    const reservation = createReservation({
      status: ReservationStatus.Cancelled,
      cancellationReason: CancellationReason.CustomerRequest,
      paymentStatus: PaymentStatus.Paid,
      chargeReference: 'mock-charge-reference',
      refundRequestId: REFUND_REQUEST_ID,
    });
    repository.findAndLockById.mockResolvedValue(reservation);

    await getRefundSucceededHandler()(REFUND_SUCCEEDED);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(repository.findAndLockById).toHaveBeenCalledWith(RESERVATION_ID, manager);
    expect(repository.saveReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ReservationStatus.Cancelled,
        cancellationReason: CancellationReason.CustomerRequest,
        paymentStatus: PaymentStatus.Refunded,
        refundReference: 'mock-refund-reference',
      }),
      manager,
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a different refund request ID',
      createReservation({
        refundRequestId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      }),
    ],
    [
      'a different refund amount',
      createReservation({ refundRequestId: REFUND_REQUEST_ID, totalAmount: TOTAL_AMOUNT + 1 }),
    ],
    ['a missing Reservation', null],
    [
      'an already applied refund',
      createReservation({
        paymentStatus: PaymentStatus.Refunded,
        refundRequestId: REFUND_REQUEST_ID,
        refundReference: 'existing-refund-reference',
      }),
    ],
  ])('idempotently ignores refund success with %s', async (_case, reservation) => {
    repository.findAndLockById.mockResolvedValue(reservation);

    await getRefundSucceededHandler()(REFUND_SUCCEEDED);

    expect(repository.saveReservation).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });
});
