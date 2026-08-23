# Booking Task Checklist

Active plan: `docs/features/booking/PLAN.md`

Status: Milestones 1 through 4 are approved. Milestone 5 payment, cancellation, and no-show is next.

## Milestone 1 - Planning and Tracking

- [x] Confirm the single-hotel Booking boundary and simplicity rules.
- [x] Confirm Booking-local Customer, Payment, and Housekeeping mocks.
- [x] Confirm immutable Reservation behavior and cancel-and-recreate changes.
- [x] Confirm Reservation, Reservation Item, and Room Assignment persistence rules.
- [x] Confirm bounded mixed Room Type availability behavior.
- [x] Confirm pending expiration, payment, refund, cancellation, and no-show behavior.
- [x] Confirm check-in and check-out behavior.
- [x] Confirm direct `EntityManager` transaction participation and lock ordering.
- [x] Confirm HTTP routes, RBAC, ownership, validation, responses, and errors.
- [x] Confirm controller and service unit-test scope.
- [x] Create `docs/features/booking/PLAN.md` as the single Booking design source.
- [x] Create this task checklist.
- [x] Remove the superseded `docs/features/booking/DECISIONS.md`.
- [x] Align Booking dependencies in `docs/architecture.md`.
- [x] Record the active Booking checkpoint in `PROGRESS.md`.
- [x] Run focused documentation verification.
- [x] Review and approve Milestone 1 before source implementation starts.

### Verification Evidence

- On 2026-08-23, repository-local Prettier passed for the Booking plan, task checklist, project progress, and architecture document.
- `git diff --check` passed.
- A scope scan confirmed that no Booking source directory exists, the superseded decision record is removed, and the new plan and task files exist.
- A language scan confirmed that the changed documents contain no em dash characters.

## Milestone 2 - Persistence and Integration Foundation

- [x] Add Reservation, payment, and cancellation enums.
- [x] Add Reservation, Reservation Item, and Room Assignment entities.
- [x] Add the single Booking migration with internal foreign keys, checks, and indexes.
- [x] Add the active Room Assignment partial unique index.
- [x] Add `BookingRepositoryPort` and `TypeOrmBookingRepository`.
- [x] Add the injectable Booking clock.
- [x] Add the Room Catalog Booking contract and export token.
- [x] Extend Pricing quote access with an optional transaction manager.
- [x] Add the Booking-local event bus and event types.
- [x] Add the mock Payment and no-op Housekeeping handlers.
- [x] Add `BookingModule` wiring and register it in `AppModule`.
- [x] Run focused verification.
- [x] Review and approve Milestone 2.

### Verification Evidence

- On 2026-08-23, the focused Pricing quote and Room Catalog module suites passed with 2 suites and 15 tests.
- Focused ESLint and Prettier checks passed for all Milestone 2 TypeScript and tracking files.
- The repository-local Nest build and `git diff --check` passed.
- Entity metadata and Booking query SQL were inspected without running a live PostgreSQL migration.
- Primary and independent reviews found no remaining material issues after event error handling, event typing, and check-out timestamp fixes.

## Milestone 3 - Availability

- [x] Add availability query and response DTOs.
- [x] Validate hotel-local dates, 30-night stays, guest count, and room quantity.
- [x] Read Room Catalog capacity and Facilities in bulk.
- [x] Read overlapping Booking commitments in bulk.
- [x] Request complete Pricing quotes in bulk.
- [x] Reject searches with more than 10 filtered candidate Room Types.
- [x] Generate mixed Room Type combinations recursively with pruning.
- [x] Apply total-price, distinct-type, and canonical-signature sorting.
- [x] Return exact pagination through a real `PaginatedResult`.
- [x] Add the public availability controller.
- [x] Add availability controller and service unit tests.
- [x] Run focused verification.
- [x] Review and approve Milestone 3.

### Verification Evidence

- On 2026-08-24, the Availability controller and service suites passed with 2 suites and 15 tests.
- Focused ESLint and Prettier checks passed for all Milestone 3 TypeScript files and tracking files.
- The repository-local Nest build and `git diff --check` passed.
- Primary and independent reviews confirmed the validation split, bounded option generation, deterministic sorting, exact pagination, public route metadata, and Swagger failure coverage.

## Milestone 4 - Reservation Core

- [x] Add Customer and Receptionist creation DTOs.
- [x] Add Customer and staff query DTOs.
- [x] Add the shared Reservation response DTO.
- [x] Implement Customer creation with `accountId` as mock `customerId`.
- [x] Implement Receptionist creation with a supplied Customer UUID.
- [x] Validate distinct items, total quantity, guest capacity, availability, and Pricing.
- [x] Lock sorted Room Type IDs and repeat decisive checks in one transaction.
- [x] Store immutable contact, stay, item, and price snapshots.
- [x] Implement global UUID idempotency replay.
- [x] Implement lazy pending expiration without a scheduler.
- [x] Implement Customer-owned list and detail queries.
- [x] Implement staff list and detail queries and filters.
- [x] Add Customer, staff, and Receptionist controller coverage for the milestone.
- [x] Add Reservation command and query service unit tests.
- [x] Run focused verification.
- [x] Review and approve Milestone 4.

### Verification Evidence

- On 2026-08-24, the three Milestone 4 controller suites and two service suites passed with 5 suites and 43 tests.
- All current Booking controller and service suites passed with 7 suites and 58 tests.
- Focused ESLint and Prettier checks, the repository-local Nest build, and `git diff --check` passed.
- Primary and independent reviews confirmed validation responsibilities, transaction manager propagation, sorted locks, idempotency races and ownership, effective-status pagination, PostgreSQL integer bounds, response field safety, RBAC, routes, and Swagger metadata.

## Milestone 5 - Payment, Cancellation, and No-Show

- [ ] Implement `PaymentRequested` and `PaymentSucceeded` handling.
- [ ] Implement `RefundRequested` and `RefundSucceeded` handling.
- [ ] Reuse request IDs for repeated payment and refund delivery.
- [ ] Confirm only matching, unexpired pending Reservations.
- [ ] Refund successful late payments without restoring inventory.
- [ ] Implement Customer and Receptionist cancellation.
- [ ] Implement no-show without refund.
- [ ] Add payment, cancellation, and no-show controller coverage.
- [ ] Add Payment Event and Reservation Command service unit tests.
- [ ] Run focused verification.
- [ ] Review and approve Milestone 5.

## Milestone 6 - Check-In and Check-Out

- [ ] Add check-in request validation for distinct Room IDs.
- [ ] Lock the Reservation and sorted physical Room IDs.
- [ ] Validate paid state, date window, Room Type quantities, `READY` status, and active assignments.
- [ ] Write all Room Assignments and check in atomically.
- [ ] Release all active assignments during check-out.
- [ ] Mark every assigned Room `DIRTY` in the check-out transaction.
- [ ] Publish `RoomsCheckedOut` after commit.
- [ ] Add check-in and check-out controller coverage.
- [ ] Add Check-In and Check-Out service unit tests.
- [ ] Run focused verification.
- [ ] Review and approve Milestone 6.

## Milestone 7 - Full Verification and Documentation Review

- [ ] Run all 4 Booking controller unit-test suites.
- [ ] Run all 6 Booking service unit-test suites.
- [ ] Run relevant ESLint checks.
- [ ] Run relevant Prettier checks.
- [ ] Run the repository-local Nest build.
- [ ] Run `git diff --check`.
- [ ] Review Swagger metadata against the implemented API.
- [ ] Review module imports, exports, mock adapters, and dependency direction.
- [ ] Review transaction boundaries and sorted lock acquisition.
- [ ] Review README and architecture documentation for implementation accuracy.
- [ ] Record exact verification evidence in this file and `PROGRESS.md`.
- [ ] Mark Booking complete under the approved scope.
- [ ] Review and approve Milestone 7.

## Deferred Work

The following work remains outside the approved Booking MVP:

- Real Customer, Payment, and Housekeeping modules.
- Durable events, queues, outbox delivery, retries, and scheduler infrastructure.
- Reservation edits, amendments, partial operations, and multiple payments.
- Operational-capacity conflict detection and retirement guards.
- Repository, migration, DTO, module-wiring, PostgreSQL integration, and E2E tests.
