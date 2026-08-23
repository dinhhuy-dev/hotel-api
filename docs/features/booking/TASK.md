# Booking Task Checklist

Active plan: `docs/features/booking/PLAN.md`

Status: Milestone 1 planning and tracking is complete and awaiting review.

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
- [ ] Review and approve Milestone 1 before source implementation starts.

### Verification Evidence

- On 2026-08-23, repository-local Prettier passed for the Booking plan, task checklist, project progress, and architecture document.
- `git diff --check` passed.
- A scope scan confirmed that no Booking source directory exists, the superseded decision record is removed, and the new plan and task files exist.
- A language scan confirmed that the changed documents contain no em dash characters.

## Milestone 2 - Persistence and Integration Foundation

- [ ] Add Reservation, payment, and cancellation enums.
- [ ] Add Reservation, Reservation Item, and Room Assignment entities.
- [ ] Add the single Booking migration with internal foreign keys, checks, and indexes.
- [ ] Add the active Room Assignment partial unique index.
- [ ] Add `BookingRepositoryPort` and `TypeOrmBookingRepository`.
- [ ] Add the injectable Booking clock.
- [ ] Add the Room Catalog Booking contract and export token.
- [ ] Extend Pricing quote access with an optional transaction manager.
- [ ] Add the Booking-local event bus and event types.
- [ ] Add the mock Payment and no-op Housekeeping handlers.
- [ ] Add `BookingModule` wiring and register it in `AppModule`.
- [ ] Run focused verification.
- [ ] Review and approve Milestone 2.

## Milestone 3 - Availability

- [ ] Add availability query and response DTOs.
- [ ] Validate hotel-local dates, 30-night stays, guest count, and room quantity.
- [ ] Read Room Catalog capacity and Facilities in bulk.
- [ ] Read overlapping Booking commitments in bulk.
- [ ] Request complete Pricing quotes in bulk.
- [ ] Reject searches with more than 10 filtered candidate Room Types.
- [ ] Generate mixed Room Type combinations recursively with pruning.
- [ ] Apply total-price, distinct-type, and canonical-signature sorting.
- [ ] Return exact pagination through a real `PaginatedResult`.
- [ ] Add the public availability controller.
- [ ] Add availability controller and service unit tests.
- [ ] Run focused verification.
- [ ] Review and approve Milestone 3.

## Milestone 4 - Reservation Core

- [ ] Add Customer and Receptionist creation DTOs.
- [ ] Add Customer and staff query DTOs.
- [ ] Add the shared Reservation response DTO.
- [ ] Implement Customer creation with `accountId` as mock `customerId`.
- [ ] Implement Receptionist creation with a supplied Customer UUID.
- [ ] Validate distinct items, total quantity, guest capacity, availability, and Pricing.
- [ ] Lock sorted Room Type IDs and repeat decisive checks in one transaction.
- [ ] Store immutable contact, stay, item, and price snapshots.
- [ ] Implement global UUID idempotency replay.
- [ ] Implement lazy pending expiration without a scheduler.
- [ ] Implement Customer-owned list and detail queries.
- [ ] Implement staff list and detail queries and filters.
- [ ] Add Customer, staff, and Receptionist controller coverage for the milestone.
- [ ] Add Reservation command and query service unit tests.
- [ ] Run focused verification.
- [ ] Review and approve Milestone 4.

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
