# Booking Feature Plan

## Status

Milestones 1 through 5 are approved. Milestone 6 check-in and check-out is next.

This plan is the single source of truth for the approved Booking MVP. Work proceeds one milestone at a time, with a review checkpoint after each milestone.

## Goal

Implement the single-hotel Booking bounded context for public availability, immutable Reservations, mock payment orchestration, room assignment, check-in, and check-out.

Booking uses the completed Room Catalog and Pricing modules through intentional public contracts. Customer, Payment, and Housekeeping remain unimplemented as separate modules for this MVP. Booking uses narrow local mocks so implementation effort stays focused on Booking behavior.

## Simplicity Rules

- Prefer the smallest design that preserves the approved Booking workflow.
- Do not add a separate Customer, Payment, Housekeeping, Reservation, Stay, or Inventory module.
- Do not add a generic transaction abstraction, shared transaction context, scheduler, outbox, retry framework, or generic event framework.
- Do not support Reservation edits. A changed stay must be cancelled and recreated.
- Do not implement post-booking operational-capacity conflict detection or planned-retirement guards.
- Keep automated coverage to controller and service unit tests.
- Keep one coherent implementation checkpoint active at a time.

## Scope

The Booking MVP provides:

- Public availability search with mixed Room Type options and complete stay prices.
- Customer and Receptionist Reservation creation.
- Immutable multi-room Reservations with accepted price snapshots.
- Fifteen-minute pending inventory holds.
- Event-driven mock payment and refund handling.
- Customer-owned Reservation reads and cancellation.
- Staff Reservation reads.
- Receptionist payment initiation, cancellation, no-show, check-in, and check-out.
- Physical room assignment at check-in.
- Room release and Room Catalog `DIRTY` status updates at check-out.
- A no-op post-commit Housekeeping event handler.

## Non-Goals

The Booking MVP does not include:

- Real Customer profiles or a Customer module.
- A real Payment module, payment table, gateway, callback endpoint, or provider authentication.
- A real Housekeeping module or task creation.
- A scheduler, worker, queue, outbox, retry policy, or dead-letter handling.
- Reservation edits, amendments, partial cancellation, partial check-in, or partial check-out.
- Deposits, partial payment, multiple charges, or multiple refunds.
- Confirmation codes.
- Guest booking without an authenticated account.
- Guest identity documents or individual guest lists.
- Physical room selection before check-in.
- An availability table or daily inventory ledger.
- Scheduled maintenance blocks, commercial overbooking, or availability overrides.
- Post-booking capacity-loss alerts, retirement guards, or capacity-conflict queries.
- Taxes, service fees, promotions, vouchers, discounts, rate plans, or multiple currencies.
- Reporting, notifications, invoices, branches, multiple hotels, or tenancy fields.

## Module Boundary

Booking owns:

- Availability orchestration and mixed Room Type option composition.
- Reservations and Reservation Items.
- Pending hold expiration rules.
- Booking-local payment and refund request state.
- Physical room assignments.
- Check-in and check-out orchestration.
- Booking idempotency and transaction rules.

Booking does not own Room Types, facilities, physical room operational status, Room Rates, real Customer profiles, real Payment transactions, or Housekeeping tasks.

The real synchronous dependencies are:

```text
booking -> room-catalog
booking -> pricing
```

Booking-local mock dependencies are:

```text
booking -> mock payment event handler
booking -> no-op housekeeping event handler
```

For online Customer operations, the authenticated `accountId` is used as the mock `customerId`. Receptionist creation accepts a Customer UUID without calling a Customer module.

## Module Structure

Booking follows the standard NestJS layered structure:

```text
src/modules/booking/
|-- contracts/
|-- controller/
|-- dto/
|-- entities/
|-- events/
|-- repositories/
|   |-- ports/
|   `-- typeorm/
|-- services/
`-- booking.module.ts
```

The service split is:

- `AvailabilityService`
- `ReservationCommandService`
- `ReservationQueryService`
- `PaymentEventService`
- `CheckInService`
- `CheckOutService`

Lazy expiration is a private or shared helper used by Reservation services. It is not a separate provider.

Persistence uses one `BookingRepositoryPort` and one `TypeOrmBookingRepository` for Reservations, Reservation Items, and Room Assignments.

## Business Conventions

- The system manages one hotel and has no `hotelId`.
- The business timezone is `Asia/Ho_Chi_Minh`.
- Calendar dates use strict `YYYY-MM-DD` strings.
- Stay ranges use `[checkInDate, checkOutDate)`.
- Check-out does not consume a night.
- Audit and action timestamps are stored in UTC.
- VND amounts are positive integers.
- Booking never trusts client-supplied prices, totals, capacities, or availability.
- Action-specific endpoints replace generic status updates.

Booking owns an injectable `BOOKING_CLOCK` contract:

```text
now(): Date
today(): string
```

The runtime implementation calculates `today()` in `Asia/Ho_Chi_Minh`. Booking does not refactor or export the Pricing clock.

## Reservation Lifecycle

Reservation statuses are:

```text
PENDING -> CONFIRMED -> CHECKED_IN -> CHECKED_OUT
    |           |
    +-----------+-> CANCELLED
```

Allowed direct transitions are:

- `PENDING -> CONFIRMED`
- `PENDING -> CANCELLED`
- `CONFIRMED -> CHECKED_IN`
- `CONFIRMED -> CANCELLED`
- `CHECKED_IN -> CHECKED_OUT`

No-show uses `CANCELLED` with reason `NO_SHOW`. It is not a separate status.

Dates, items, quantities, guest count, and contact snapshots are immutable after creation. A Customer or Receptionist must cancel and create a new Reservation to change them.

Reservations are never hard deleted.

## Payment State

Payment statuses are:

- `UNPAID`
- `PAID`
- `REFUNDED`

The asynchronous processing state is derived instead of stored:

```text
chargeRequestId is present and chargeReference is absent
=> charge is awaiting completion
```

```text
refundRequestId is present and refundReference is absent
=> refund is awaiting completion
```

Each Reservation supports at most one full charge and one full refund. There is no `paidAmount`, outstanding amount, Payment Request entity, or Payment transaction history.

## Cancellation Reasons

Cancellation reasons are limited to:

- `CUSTOMER_REQUEST`
- `STAFF_REQUEST`
- `PAYMENT_TIMEOUT`
- `NO_SHOW`

Booking does not store a free-text cancellation note.

## Data Model

### Reservation

Table: `reservations`

| Column                     | Rule                                                    |
| -------------------------- | ------------------------------------------------------- |
| `id`                       | UUID primary key                                        |
| `customer_id`              | Mock Customer UUID with no external foreign key         |
| `contact_name`             | Immutable Reservation contact snapshot                  |
| `contact_phone`            | Immutable Reservation contact snapshot                  |
| `check_in_date`            | PostgreSQL `date`, inclusive                            |
| `check_out_date`           | PostgreSQL `date`, exclusive                            |
| `guest_count`              | Positive integer                                        |
| `status`                   | Reservation status enum                                 |
| `total_amount`             | Positive VND integer                                    |
| `expires_at`               | UTC timestamp for the original pending hold             |
| `payment_status`           | Stable payment status enum                              |
| `charge_request_id`        | Nullable UUID used for charge event idempotency         |
| `charge_reference`         | Nullable mock charge reference                          |
| `refund_request_id`        | Nullable UUID used for refund event idempotency         |
| `refund_reference`         | Nullable mock refund reference                          |
| `idempotency_key`          | Required globally unique UUID from the creation request |
| `cancellation_reason`      | Nullable cancellation reason enum                       |
| `checked_in_at`            | Nullable UTC timestamp                                  |
| `checked_out_at`           | Nullable UTC timestamp                                  |
| `created_at`, `updated_at` | UTC audit timestamps                                    |

The schema uses simple checks for a valid date range, positive guest count, and positive total amount. It does not add cross-field checks between status and nullable lifecycle fields.

Indexes include:

- A unique index on `idempotency_key`.
- A Customer and creation-time index for Customer listing.
- A status and stay-date index for commitment and staff queries.

Booking does not store `createdByAccountId`, `requestFingerprint`, or a confirmation code. A repeated idempotency key returns the original Reservation when the caller may access it. Otherwise it returns `409 IDEMPOTENCY_KEY_REUSED`. Booking does not compare a repeated request payload with the original payload.

### Reservation Item

Table: `reservation_items`

| Column           | Rule                                              |
| ---------------- | ------------------------------------------------- |
| `id`             | UUID primary key                                  |
| `reservation_id` | Internal foreign key to Reservation               |
| `room_type_id`   | Room Catalog identifier with no external FK       |
| `quantity`       | Integer from 1 through 5                          |
| `total_price`    | Accepted positive VND price snapshot for the item |

A Room Type may appear only once in one Reservation. Duplicate Room Type items are rejected and are not merged.

The Reservation total equals the sum of item totals. Booking does not store Room Type names, capacity snapshots, applied Room Rates, nightly prices, or per-night Reservation rows.

### Room Assignment

Table: `room_assignments`

| Column                | Rule                                                |
| --------------------- | --------------------------------------------------- |
| `id`                  | UUID primary key                                    |
| `reservation_item_id` | Internal foreign key to Reservation Item            |
| `room_id`             | Room Catalog identifier with no external FK         |
| `assigned_at`         | UTC assignment timestamp                            |
| `released_at`         | Nullable UTC release timestamp set during check-out |

Assignment rows remain as history after check-out. A PostgreSQL partial unique index on `room_id` where `released_at IS NULL` prevents one physical room from belonging to two active stays.

## Room Catalog Contract

Room Catalog exports one `BOOKING_ROOM_CATALOG_SERVICE` contract.

### Availability Room Types

```text
findAvailabilityRoomTypes(
  { roomTypeIds?, lockForUpdate },
  manager
)
```

Each result contains:

- Room Type ID, name, and description.
- Maximum occupancy.
- Sellable physical room count.
- Active Facilities with ID and name.

Sellable physical capacity includes `READY`, `DIRTY`, and `CLEANING`. It excludes `OUT_OF_SERVICE` and `RETIRED`.

Public availability omits `roomTypeIds` for an unfiltered search or supplies the one requested filter ID, and uses `lockForUpdate: false`. Reservation creation supplies all sorted selected Room Type IDs and uses `lockForUpdate: true`.

### Assignment Rooms

```text
findRoomsForAssignment(
  { roomIds, lockForUpdate },
  manager
)
```

Each result contains the Room ID, Room Type ID, room number, and operational status. Check-in requests locked rooms with `lockForUpdate: true`.

### Check-Out Status Change

```text
markRoomsDirty(roomIds, manager)
```

Room Catalog performs its own repository access through the supplied `EntityManager`. Booking never imports Room Catalog entities or repositories.

## Pricing Contract

Booking uses the existing Pricing bulk quote contract. The contract accepts an optional `EntityManager` so Booking can request fresh quotes through the active Reservation transaction. Existing Pricing callers and tests may omit it.

Booking supplies distinct Room Type IDs and the requested stay. Every selected Room Type must have complete Pricing coverage. Booking calculates:

```text
itemTotal = quantity * pricePerRoomStay
reservationTotal = sum(itemTotal)
```

Pricing continues to own rate intersection and quote calculation. Booking stores only accepted item and Reservation totals.

## Availability Search

### Input

Public availability accepts:

- `checkInDate`
- `checkOutDate`
- `guestCount`
- `roomQuantity`, default `1`, maximum `5`
- Optional `roomTypeId`
- `page`, default `1`
- `limit`, default `10`, maximum `50`

Rules:

- Check-in is the current hotel-local date or later.
- Check-out is later than check-in.
- A stay is at most 30 nights.
- Guest count is a positive integer with no fixed maximum.
- Room quantity is from 1 through 5.

### Capacity

Booking commitments subtract Reservation Item quantities for overlapping Reservations in these states:

- `CONFIRMED`
- `CHECKED_IN`
- `PENDING` when `expiresAt > now`

They do not subtract `CANCELLED`, `CHECKED_OUT`, or expired `PENDING` Reservations.

Date overlap uses:

```text
existing.checkInDate < requested.checkOutDate
and existing.checkOutDate > requested.checkInDate
```

Per Room Type:

```text
availableQuantity = sellableRoomCount - committedQuantity
```

### Option Generation

Candidates are filtered to active Room Types with positive availability and complete Pricing coverage. If more than 10 candidates remain, Booking returns `400 AVAILABILITY_SEARCH_TOO_BROAD`.

Booking recursively enumerates combinations with pruning. Every option satisfies:

```text
sum(selectedQuantity) = requestedRoomQuantity
```

```text
sum(selectedQuantity * maxOccupancy) >= guestCount
```

```text
0 <= selectedQuantity <= availableQuantity
```

Options sort by:

1. Total price ascending.
2. Number of distinct Room Types ascending.
3. Canonical Room Type ID and quantity signature ascending.

Pagination uses the exact generated result count and returns a real `PaginatedResult`.

Each option item contains public Room Type information, selected quantity, maximum occupancy, current available quantity, one-room stay price, item subtotal, and active Facilities. Each option contains total room quantity, total capacity, and total price.

Availability is a read-only snapshot and does not reserve inventory.

## Reservation Creation

Every Reservation starts as `PENDING`, `UNPAID`, and expires 15 minutes after creation.

Customer creation derives `customerId` from the authenticated `accountId`. Receptionist creation accepts a Customer UUID. Both requests provide immutable contact name and phone snapshots.

The creation request supplies distinct Room Type items. The total item quantity is from 1 through 5. The server validates Room Types, guest capacity, availability, and complete Pricing coverage.

Inside one transaction, Booking:

1. Resolves or replays the global idempotency key.
2. Sorts and locks requested Room Type rows.
3. Rechecks Room Type facts and sellable physical capacity.
4. Rechecks overlapping Booking commitments.
5. Requests fresh Pricing quotes with the same manager.
6. Calculates item totals and the Reservation total.
7. Writes the Reservation and every Reservation Item.

Availability search results are not Reservation guarantees.

## Pending Expiration

Booking does not use a scheduler.

- Availability ignores a pending hold when `expiresAt <= now`.
- Booking commands and Customer or staff queries lazily transition expired `PENDING` Reservations to `CANCELLED` with `PAYMENT_TIMEOUT`.
- Lazy expiration uses a transaction and Reservation row lock when it changes persisted state.
- Payment success checks expiration at event handling time.
- A late successful payment never confirms an expired Reservation and instead creates a refund request.

## Payment and Refund Events

Booking uses a local in-process event bus with these events:

- `PaymentRequested`
- `PaymentSucceeded`
- `RefundRequested`
- `RefundSucceeded`
- `RoomsCheckedOut`

Payment and refund events contain the Reservation ID, request ID, amount, and a reference when a mock operation has completed. The request ID is also the event idempotency key. Events are not stored.

The mock Payment handler always succeeds. It receives a request event and asynchronously emits the matching success event. Event dispatch uses a microtask after the Booking transaction commits.

Payment initiation:

- Applies only to an unexpired `PENDING` Reservation.
- Creates a charge request ID once.
- Repeated calls publish the same request ID.
- Returns `202 Accepted` while the Reservation remains `PENDING` and `UNPAID`.

Payment success:

- Locks the Reservation.
- Ignores an already applied matching success event.
- Confirms only a matching, unexpired `PENDING` Reservation.
- Stores the mock charge reference and changes the Reservation to `CONFIRMED` and `PAID`.
- Creates a refund request instead when the Reservation is expired or already cancelled.

Cancellation changes Reservation state immediately. A paid or late-paid cancelled Reservation requests one full refund. Refund success stores the refund reference and changes payment status to `REFUNDED`.

The in-process bus has no delivery guarantee. If an event is lost during process shutdown, a repeated payment or refund-triggering operation republishes the same request ID.

## Cancellation and No-Show

Customer and Receptionist may cancel `PENDING` or `CONFIRMED` Reservations. Customer cancellation uses `CUSTOMER_REQUEST`; Receptionist cancellation uses `STAFF_REQUEST`.

Cancellation releases the inventory commitment immediately and does not wait for refund completion.

Repeating cancellation for an already `CANCELLED` Reservation is an idempotent success for an authorized caller. Booking returns the existing Reservation and republishes the same pending refund request when `refundRequestId` is present and `refundReference` is absent.

Receptionist no-show:

- Applies only to `CONFIRMED` Reservations.
- Is allowed from `checkInDate` until before `checkOutDate`.
- Cancels with reason `NO_SHOW`.
- Does not request a refund.

## Check-In

Check-in is all-or-nothing and requires:

- Reservation status `CONFIRMED`.
- Payment status `PAID`.
- Current hotel-local date from `checkInDate` until before `checkOutDate`.
- The exact total number of distinct Room IDs required by the Reservation Items.
- Every Room to match the required Room Type quantities.
- Every Room to be `READY`.
- No Room to have another active assignment.

The Receptionist supplies only Room IDs. Booking groups locked Room facts by Room Type and matches them to Reservation Items.

Inside one transaction, Booking locks the Reservation, sorts and locks Room IDs, validates assignment, writes Room Assignments, and changes the Reservation to `CHECKED_IN`.

Booking does not attempt to prevent or report capacity loss between Reservation creation and check-in. Insufficient assignable Rooms return `409 ROOM_ASSIGNMENT_UNAVAILABLE`.

## Check-Out

Check-out is all-or-nothing and applies only to `CHECKED_IN` Reservations. Early check-out is allowed and does not change price or create a refund.

Inside one transaction, Booking locks the Reservation and active assignments, locks assigned Rooms, marks every assigned Room `DIRTY` through Room Catalog, sets assignment `releasedAt`, and changes the Reservation to `CHECKED_OUT`.

After commit, Booking publishes `RoomsCheckedOut` with the Reservation ID, Room IDs, and check-out timestamp. The mock Housekeeping handler receives the event and performs no work.

## Concurrency and Transaction Rules

Application services define transaction boundaries. They call `DataSource.transaction()` once and pass the same `EntityManager` to Booking repositories and external contracts. Repositories do not start nested transactions.

Operations that require a transaction are:

- Reservation creation.
- Payment request initiation.
- Payment success handling.
- Cancellation and no-show.
- Refund success handling.
- Lazy expiration when it changes persisted state.
- Customer or staff queries that materialize lazy expiration.
- Check-in and check-out.

Public availability is read-only and does not use a transaction or locks.

Lock rules:

- Reservation creation sorts and locks Room Type rows with `pessimistic_write`.
- Reservation lifecycle operations lock the Reservation row.
- Check-in locks the Reservation first, then sorted Room IDs.
- Check-out locks the Reservation, active assignments, and sorted Room IDs.
- The active Room Assignment partial unique index is the final duplicate-assignment guard.

Race outcomes are:

- Payment success uses handling time. An expired Reservation is cancelled and refunded.
- Cancel racing with payment always ends cancelled. A successful charge is refunded.
- Check-in racing with cancellation or no-show follows the operation that locks the Reservation first.
- Repeated check-in or check-out accepts the first valid transition and rejects later attempts.

Booking does not use Serializable isolation, advisory locks, automatic transaction retries, or a generic lock service.

## HTTP API

All effective paths use the global `/api` prefix.

### Public Availability

Controller path: `v1/booking/availability`

| Method | Effective route                | Behavior                    |
| ------ | ------------------------------ | --------------------------- |
| `GET`  | `/api/v1/booking/availability` | Search availability options |

The controller uses `@Public()`.

### Customer Reservations

Controller path: `v1/booking/customer/reservations`

| Method | Effective route                                    | Behavior                    |
| ------ | -------------------------------------------------- | --------------------------- |
| `POST` | `/api/v1/booking/customer/reservations`            | Create an owned Reservation |
| `GET`  | `/api/v1/booking/customer/reservations`            | List owned Reservations     |
| `GET`  | `/api/v1/booking/customer/reservations/:id`        | View one owned Reservation  |
| `POST` | `/api/v1/booking/customer/reservations/:id/pay`    | Request mock payment        |
| `POST` | `/api/v1/booking/customer/reservations/:id/cancel` | Cancel an owned Reservation |

The controller allows only `CUSTOMER`. It passes `@CurrentUser().accountId` into services and never accepts a Customer identifier from a Customer DTO.

### Staff Reservation Reads

Controller path: `v1/booking/staff/reservations`

| Method | Effective route                          | Behavior             |
| ------ | ---------------------------------------- | -------------------- |
| `GET`  | `/api/v1/booking/staff/reservations`     | List Reservations    |
| `GET`  | `/api/v1/booking/staff/reservations/:id` | View one Reservation |

The controller allows `RECEPTIONIST` and `HOTEL_MANAGER`.

### Receptionist Commands

Controller path: `v1/booking/receptionist/reservations`

| Method | Effective route                                           | Behavior                  |
| ------ | --------------------------------------------------------- | ------------------------- |
| `POST` | `/api/v1/booking/receptionist/reservations`               | Create a Reservation      |
| `POST` | `/api/v1/booking/receptionist/reservations/:id/pay`       | Request mock payment      |
| `POST` | `/api/v1/booking/receptionist/reservations/:id/cancel`    | Cancel a Reservation      |
| `POST` | `/api/v1/booking/receptionist/reservations/:id/check-in`  | Check in and assign Rooms |
| `POST` | `/api/v1/booking/receptionist/reservations/:id/check-out` | Check out                 |
| `POST` | `/api/v1/booking/receptionist/reservations/:id/no-show`   | Mark no-show              |

The controller allows only `RECEPTIONIST`.

Administrator, Housekeeping Staff, and Maintenance Staff have no Booking HTTP API.

## Request Validation

Availability and creation dates use strict calendar-date validation. Creation requests require:

- Contact name from 1 through 100 characters.
- Contact phone with 8 through 15 digits and an optional leading `+`.
- Positive guest count.
- Distinct Room Type items.
- Positive item quantities with a total from 1 through 5.
- A required UUID `Idempotency-Key` header.

Receptionist creation also requires a Customer UUID.

Check-in accepts only distinct Room UUIDs. Pay, cancel, no-show, and check-out have no request body.

## Queries and Responses

Customer lists support `page`, `limit`, and optional Reservation status. They return only Reservations owned by the authenticated Customer.

Staff lists support `page`, `limit`, optional Customer ID, optional status, optional exact check-in date, and optional exact check-out date.

Both lists sort by `createdAt DESC`, then `id ASC`, and return a real `PaginatedResult`.

Customer and staff use one Reservation response DTO containing:

- Reservation lifecycle, contact, stay, amount, payment, cancellation, and audit fields.
- Items with Room Type ID, quantity, and total price.
- Assignments after check-in with Room ID and room number.

The response does not expose Room Type details, Facilities, applied rates, charge or refund request IDs, or mock payment references.

Create returns `201`. Payment initiation returns `202`. Cancel, no-show, check-in, and check-out return `200`. Every action returns the latest Reservation response instead of void.

A cancellation response may remain `PAID` until the asynchronous refund success event is processed. Clients may poll the detail endpoint for `PAID` or `REFUNDED` state.

Customer ownership failures return `404 RESERVATION_NOT_FOUND` instead of revealing another Customer's Reservation.

## Error Contract

Booking uses the existing standard-module HTTP error format with safe messages and stable codes.

Expected `400` codes:

- `INVALID_AVAILABILITY_SEARCH`
- `AVAILABILITY_SEARCH_TOO_BROAD`
- `INVALID_RESERVATION_REQUEST`
- `INVALID_RESERVATION_RANGE`

Expected `404` code:

- `RESERVATION_NOT_FOUND`

Expected `409` codes:

- `ROOM_TYPE_UNAVAILABLE`
- `PRICING_UNAVAILABLE`
- `ROOM_AVAILABILITY_CONFLICT`
- `IDEMPOTENCY_KEY_REUSED`
- `INVALID_RESERVATION_STATE`
- `RESERVATION_EXPIRED`
- `ROOM_ASSIGNMENT_UNAVAILABLE`

Authentication and authorization continue to use `401` and `403`. Booking does not introduce HTTP `422` behavior.

## Swagger

Every controller documents operation summaries, request DTOs, response DTOs, the runtime response envelope, and operation-specific failures.

- Public availability documents `@Public()` behavior and paginated options.
- Protected controllers document bearer authentication and class-level role requirements.
- List routes use `ApiPaginatedSuccessResponse`.
- Object routes use `ApiSuccessResponse` with the correct `201`, `202`, or `200` status.
- Route UUIDs use `ParseUUIDPipe`.

## Testing Strategy

The required automated scope is controller and service unit tests only.

Required controller suites:

- Public availability controller.
- Customer Reservation controller.
- Staff Reservation query controller.
- Receptionist Reservation command controller.

Required service suites:

- Availability service.
- Reservation command service.
- Reservation query service.
- Payment event service.
- Check-in service.
- Check-out service.

Controller tests cover delegation, route metadata, public or RBAC metadata, Swagger response metadata, current-user forwarding, and real `PaginatedResult` pass-through.

Service tests mock repositories, external contracts, the clock, event publisher, and transaction manager. They cover successful flows, validation, ownership, lifecycle conflicts, expiration, idempotency, event idempotency, capacity conflicts, Pricing gaps, lock ordering, and race outcomes visible at the service boundary.

Repository adapter, migration, DTO, module-wiring, event-bus, mock-handler, PostgreSQL integration, and E2E tests are outside the required scope.

Relevant ESLint, Prettier, Nest build, and `git diff --check` checks must pass for implementation checkpoints.

## Milestones

### Milestone 1 - Planning and Tracking

- Make this plan the single source of truth for Booking.
- Create `TASK.md`.
- Remove the superseded `DECISIONS.md` after transferring approved decisions.
- Update `PROGRESS.md` with the active Booking paths and checkpoint.
- Align Booking dependencies in `docs/architecture.md` with the approved mock design.
- Run focused documentation verification.
- Stop for review before source implementation.

### Milestone 2 - Persistence and Integration Foundation

- Add Booking enums, entities, the single migration, and repository port and adapter.
- Add `BOOKING_CLOCK`.
- Add the Room Catalog Booking contract.
- Extend Pricing quote access with an optional transaction manager.
- Add the local event bus, mock Payment handler, and no-op Housekeeping handler.
- Add Booking module wiring and App Module registration.
- Run focused static verification and stop for review.

### Milestone 3 - Availability

- Add availability query and response DTOs.
- Implement bulk capacity, commitment, Pricing, and Facility reads.
- Implement bounded recursive mixed Room Type option generation.
- Add the public availability controller.
- Add controller and service unit tests.
- Run focused verification and stop for review.

### Milestone 4 - Reservation Core

- Add creation, query, and Reservation response DTOs.
- Implement Customer and Receptionist creation.
- Implement global idempotency replay.
- Implement Customer and staff list and detail queries.
- Implement lazy pending expiration.
- Add Customer, staff, and Receptionist controller coverage for the milestone.
- Run focused verification and stop for review.

### Milestone 5 - Payment, Cancellation, and No-Show

- Implement charge and refund request events and mock success handling.
- Implement payment initiation and event idempotency.
- Implement Customer and Receptionist cancellation.
- Implement no-show.
- Add controller and service unit tests.
- Run focused verification and stop for review.

### Milestone 6 - Check-In and Check-Out

- Implement locked physical-room validation and assignment.
- Implement check-in.
- Implement assignment release and Room Catalog `DIRTY` updates.
- Implement check-out and the no-op Housekeeping event.
- Add controller and service unit tests.
- Run focused verification and stop for review.

### Milestone 7 - Full Verification and Documentation Review

- Run all Booking controller and service unit tests.
- Run relevant ESLint and Prettier checks.
- Run the repository-local Nest build.
- Run `git diff --check`.
- Review Swagger, module boundaries, public exports, transaction usage, and mock behavior.
- Review README and architecture documentation for implementation accuracy.
- Record exact evidence in `TASK.md` and `PROGRESS.md`.
- Mark Booking complete under the approved scope and stop for review.

## Definition of Done

Booking is complete only when:

- Every required task in `TASK.md` is complete.
- Public availability returns bounded, sorted, exactly paginated mixed Room Type options.
- Reservation creation rechecks availability and Pricing inside its transaction.
- Immutable Reservations enforce the approved lifecycle and ownership rules.
- Mock payment and refund events behave idempotently under the approved in-process limitations.
- Check-in assigns only locked `READY` Rooms of the required Room Types.
- Check-out releases assignments and marks assigned Rooms `DIRTY` atomically.
- Required controller and service unit tests pass.
- Relevant lint, format, build, and diff checks pass.
- Swagger and project documentation match the implemented behavior.
- `PROGRESS.md` records the final status and verification evidence.
