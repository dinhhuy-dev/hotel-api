# Booking Decision Record

## Status

This document records the Booking decisions accepted during design discussion and the decisions that remain open.

It is design context only. Booking is not the active feature, and no Booking plan, task checklist, migration, entity, repository, service, controller, or test has been created. The active Pricing checkpoint remains authoritative for current work.

Do not treat an accepted design decision in this file as implemented behavior. Verify future source code and tests before reporting any Booking capability as available.

## Purpose

This record preserves the agreed Booking boundary and business behavior so a future `docs/features/booking/PLAN.md` can be created without repeating settled product discussions or silently changing prior decisions.

The future Booking plan must:

- Preserve every accepted decision in this document unless the user explicitly changes it.
- Resolve the open decisions before the affected implementation milestone begins.
- Define persistence, HTTP routes, public contracts, transactions, error codes, tests, and implementation milestones.
- Remain separate from the active Pricing plan.

## Decision Classification

- **Accepted** means the future Booking plan must preserve the decision.
- **Open** means the concern or proposal is recorded, but no final behavior has been approved.
- **Excluded** means the behavior is outside the MVP unless the user explicitly expands scope.

## Module Boundary

### Accepted

Keep `pricing` as a separate module.

Consolidate availability, reservation, room assignment, check-in, and check-out into one `booking` bounded context. Do not create separate `inventory-availability`, `reservation`, or `stay` modules for the MVP.

Booking owns:

- Availability search orchestration.
- Mixed Room Type option composition.
- Reservation lifecycle and status transitions.
- Reservation Item quantities and accepted price snapshots.
- Pending inventory holds and their expiration.
- Physical room assignments for active stays.
- Check-in and check-out orchestration.
- Booking-specific idempotency and consistency rules.

Booking does not own:

- Accounts, authentication, or account roles.
- Customer profiles.
- Room Types, facilities, physical rooms, or operational room status.
- Room Rates or quote calculation.
- Payment transactions or payment-provider behavior.
- Housekeeping tasks.
- Maintenance tasks.

### Dependency Direction

Accepted synchronous dependencies:

```text
booking -> room-catalog
booking -> pricing
booking -> customer
booking -> payment
```

Accepted post-commit event direction:

```text
booking checkout -> housekeeping event
```

Payment must not import Booking. Booking orchestrates payment operations through an intentional Payment public contract.

Room Catalog remains catalog-only. It must not import Booking or read Booking repositories.

All cross-module access uses public contracts and module-owned request and result types. Booking must not import another module's controller, TypeORM entity, repository, or internal service.

## Module Structure and Responsibilities

### Accepted

Booking follows the repository's standard NestJS layered organization:

```text
src/modules/booking/
|-- controller/
|-- dto/
|-- entities/
|-- repositories/
|   |-- ports/
|   `-- typeorm/
|-- services/
`-- booking.module.ts
```

Do not create one central `BookingService`. Use small responsibility-focused services, including:

- Availability search and option composition.
- Reservation commands.
- Reservation queries.
- Pending reservation expiration.
- Payment and confirmation orchestration.
- Physical room assignment.
- Check-in.
- Check-out.

The exact service, controller, repository, and contract names remain implementation details for the future Booking plan.

## Shared Business Conventions

### Accepted

- The system manages one hotel only. Booking has no `hotelId`, branch, or tenancy behavior.
- The business timezone is `Asia/Ho_Chi_Minh`.
- Calendar dates use hotel-local business dates.
- Audit timestamps remain UTC.
- Stay ranges are half-open: `[checkInDate, checkOutDate)`.
- The check-out date is exclusive and does not consume a night.
- Monetary amounts use VND integers with no fractional values.
- Booking does not trust client-supplied prices, totals, capacities, or availability.
- Booking uses action-specific commands and endpoints, not a generic unrestricted status patch.

## Reservation Data Direction

### Reservation

#### Accepted

One Reservation may contain multiple Room Types and multiple rooms.

A Reservation requires these business facts:

- Internal UUID.
- Short unique confirmation code.
- Immutable Customer ID.
- Shared check-in date.
- Shared check-out date.
- Total guest count.
- Reservation status.
- Accepted total amount.
- Pending expiration timestamp when applicable.
- Cancellation reason when applicable.
- Check-in timestamp when applicable.
- Check-out timestamp when applicable.
- Created and updated audit timestamps.

The confirmation code is a lookup reference, not a credential. Customer access still requires authentication and ownership validation. Staff access still requires an allowed role.

Reservations are never hard deleted. Terminal Reservation records remain as history.

Confirmed Reservation edits require the system to track or derive these financial facts:

- Amount already paid.
- Current total amount.
- Outstanding amount due at check-in.

It is valid for the paid amount to be greater than the current total amount after a price-decreasing confirmed edit.

#### Open

- Whether `paidAmount` and `outstandingAmount` are stored on Reservation or derived from immutable Payment transactions.
- Confirmation-code format, length, generation strategy, and collision handling.
- Exact database column types, indexes, and constraints.

### Reservation Item

#### Accepted

Use `ReservationItem(roomTypeId, quantity)`.

Rules:

- Every item belongs to one Reservation.
- Every item stores one Room Type ID.
- `quantity` is an integer of at least `1`.
- A Room Type may appear only once in one Reservation.
- Duplicate Room Type items are rejected, not silently merged.
- Every item uses the Reservation's shared check-in and check-out dates.
- Every item stores its accepted `totalPrice` snapshot.
- `Reservation.totalAmount` is the sum of accepted item totals.
- Later Room Rate changes do not alter existing Reservation or Reservation Item snapshots.
- No per-night Reservation price table is required for the MVP.

Booking stores Room Type identifiers without importing Room Catalog entities.

### Guest Capacity

#### Accepted

- Store one total `guestCount` on Reservation.
- Do not separate adults and children in the MVP.
- Do not store individual guest lists.
- Do not allocate individual guests to physical rooms.
- The combined maximum occupancy of every selected item must cover the Reservation's `guestCount`.

Capacity validation:

```text
sum(item.quantity * roomType.maxOccupancy) >= reservation.guestCount
```

Booking obtains current Room Type capacity facts from Room Catalog. It does not trust capacity submitted by the client.

### Room Assignment

#### Accepted

- Before arrival, a Reservation commits Room Type quantities, not physical Room IDs.
- A Receptionist assigns physical rooms during check-in.
- Assignment rows remain after check-out as history.
- Availability derives commitments from Reservation and Reservation Item, not Room Assignment rows.
- Occupancy belongs to Booking.
- Do not add `OCCUPIED` to the Room Catalog operational-status enum.
- Do not create a separate Stay module.

#### Open

- Exact Room Assignment columns and uniqueness constraints.
- Whether an assignment references Reservation directly, Reservation Item directly, or both.
- The representation of an active assignment for concurrency checks.

## Reservation Lifecycle

### Accepted Statuses

```text
PENDING -> CONFIRMED -> CHECKED_IN -> CHECKED_OUT
    |           |
    +-----------+-> CANCELLED
```

Accepted direct transitions:

- `PENDING -> CONFIRMED`
- `PENDING -> CANCELLED`
- `CONFIRMED -> CHECKED_IN`
- `CONFIRMED -> CANCELLED`
- `CHECKED_IN -> CHECKED_OUT`

Do not add a separate `NO_SHOW` status. No-show is a cancellation reason.

Dates, Room Type items, and quantities become immutable after `CHECKED_IN`.

## Pending Hold

### Accepted

- Every new Reservation starts as `PENDING`.
- `PENDING` means the Reservation is waiting for payment.
- An unexpired `PENDING` Reservation holds inventory.
- The hold duration is 15 minutes.
- Editing a pending Reservation does not extend its original expiration timestamp.
- Editing dates or items invalidates the previous payment intent and requires a new amount or payment intent.
- Availability ignores a pending Reservation when `expiresAt <= now`, even if scheduled cleanup has not changed its status yet.
- Scheduled cleanup transitions expired pending Reservations to `CANCELLED` with reason `PAYMENT_TIMEOUT`.
- Cleanup may run once per minute.
- A payment arriving after expiration must not restore or confirm the Reservation.
- A late successful payment requires a refund or explicit manual handling.

### Open

- Scheduler implementation and multi-instance coordination.
- How payment-intent invalidation is represented in Booking and Payment contracts.
- The exact transaction and locking strategy for expiration racing with payment confirmation.

## Reservation Creation

### Online Customer Creation

#### Accepted

- Online booking requires an authenticated, email-verified account with role `CUSTOMER`.
- The first booking creates a Customer profile using the submitted full name and phone number.
- Customer email comes from the authenticated account, not from untrusted Reservation input.
- One account has at most one Customer profile.
- If a profile already exists, Booking uses it.
- Booking does not silently update an existing Customer profile from Reservation input.
- Customer profile updates use a Customer-owned API.
- A newly created Customer profile remains even if Reservation creation or payment later fails.
- Reservation creation supports an `Idempotency-Key` scoped to the authenticated account.

### Receptionist Creation

#### Accepted

- Receptionist creation selects an existing Customer.
- If no Customer exists, the Receptionist creates it through the Customer API first.
- The staff Reservation request does not embed a second Customer creation workflow.

### Server-Side Validation

#### Accepted

Before writing a new Reservation, Booking repeats every decisive check in a transaction:

- Validate the requested dates.
- Validate distinct Room Type items and positive quantities.
- Resolve active Room Types through Room Catalog.
- Recalculate total guest capacity.
- Recalculate sellable physical capacity.
- Recalculate overlapping Booking commitments.
- Recheck requested total room quantity.
- Request fresh complete quotes from Pricing.
- Calculate item totals and the Reservation total on the server.
- Write the Reservation and all Reservation Items only after every check succeeds.

Availability search results are not reservation guarantees.

#### Open

- Idempotency-record storage, request fingerprinting, response replay, and retention period.
- Exact PostgreSQL serialization or locking mechanism that prevents concurrent overselling.
- How Customer profile creation is coordinated with Booking failure without creating a cross-module distributed transaction.

## Confirmation and Payment

### Accepted

- Initial confirmation requires full payment of the exact outstanding amount.
- Deposits and partial initial payments are outside scope.
- Successful online payment automatically transitions `PENDING` to `CONFIRMED`.
- Receptionist confirmation accepts a counter payment method, records payment, and confirms in one workflow.
- Do not confirm first and record payment later.
- Use one mock online payment provider for the MVP.
- Use mock counter-payment recording for the MVP.
- Payment and refund behavior remains behind a Payment provider or public-module contract.
- Support multiple immutable Payment transactions for one Reservation.
- Never mutate a completed Payment transaction to represent another charge or refund.
- Provider transaction IDs are unique.
- Repeated callbacks for the same provider transaction are idempotent successful no-ops.

Payment owns Payment transactions. Booking stores Payment identifiers only if its future plan proves they are required.

### Open

- Exact Payment public-contract operations and result types.
- Atomicity boundaries between Booking state and Payment transaction recording.
- Callback authentication and provider-event persistence.
- Recovery behavior when Payment succeeds but Booking confirmation cannot commit.

## Editing Pending Reservations

### Accepted

Customer and Receptionist may edit a `PENDING` Reservation.

Every edit must:

- Revalidate the date range.
- Reject duplicate Room Type items.
- Revalidate positive quantities.
- Recalculate total guest capacity.
- Recheck availability.
- Request new complete Pricing quotes.
- Recalculate every item price and the complete total.
- Invalidate the prior payment intent.
- Preserve the original `expiresAt`.

The edited Reservation remains `PENDING`.

## Editing Confirmed Reservations

### Accepted

Only Receptionist may change dates, Room Type items, or quantities after confirmation.

Rules:

- The Reservation remains `CONFIRMED`.
- Do not create a Reservation Amendment entity for the MVP.
- Recheck and commit the new inventory immediately.
- Recalculate `Reservation.totalAmount` and every `ReservationItem.totalPrice` immediately.
- If the new total is higher, the difference becomes the outstanding amount due at check-in.
- If the new total is lower, keep the paid amount unchanged and do not refund the difference.
- `paidAmount > totalAmount` is valid after a price-decreasing edit.
- Customer cannot edit a confirmed Reservation.
- Customer may still view or cancel an owned confirmed Reservation before check-in.
- Dates, items, and quantities are immutable after `CHECKED_IN`.

### Open

- Exact payment-intent or payment-record behavior for the increased amount before check-in.
- Concurrency strategy for replacing old commitments with new commitments without overselling either range.

## Availability Search

### Public Input

#### Accepted

```text
checkInDate
checkOutDate
guestCount
roomQuantity = 1
roomTypeId?
page?
limit?
```

Rules:

- `checkInDate` must be the current hotel-local date or later.
- `checkOutDate` must be later than `checkInDate`.
- Maximum stay length is 30 nights.
- `guestCount` is a positive integer.
- `roomQuantity` defaults to `1` and is a positive integer.
- `roomTypeId` is an optional filter.
- Check-out is exclusive.

The maximum accepted `roomQuantity` remains open.

### Sellable Physical Capacity

#### Accepted

Room Catalog currently owns these room statuses:

- `READY`
- `DIRTY`
- `CLEANING`
- `OUT_OF_SERVICE`
- `RETIRED`

For future availability, sellable physical capacity includes:

- `READY`
- `DIRTY`
- `CLEANING`

It excludes:

- `OUT_OF_SERVICE`
- `RETIRED`

At actual check-in, only `READY` rooms may be assigned.

Scheduled maintenance blocks are outside the MVP. Current operational room status is the only Room Catalog capacity signal.

### Booking Commitments

#### Accepted

Subtract Reservation Item quantities for overlapping Reservations in these states:

- `CONFIRMED`
- `CHECKED_IN`
- `PENDING` when `expiresAt > now`

Do not subtract quantities from:

- `PENDING` when `expiresAt <= now`
- `CANCELLED`
- `CHECKED_OUT`

Date overlap uses:

```text
existing.checkInDate < requested.checkOutDate
and existing.checkOutDate > requested.checkInDate
```

Per Room Type:

```text
availableQuantity = sellablePhysicalRoomCount - committedReservationQuantity
```

Availability does not read Customer, Payment, or Room Assignment tables.

## Mixed Room Type Availability Options

### Accepted

An availability result is a complete room package. It is not one independent result per Room Type.

The package may combine multiple Room Types when no single Room Type can satisfy the requested room quantity or guest count.

For each candidate Room Type `i`, choose `q[i]` such that:

```text
0 <= q[i] <= availableQuantity[i]
```

Every returned option satisfies:

```text
sum(q[i]) = requestedRoomQuantity
```

```text
sum(q[i] * roomType[i].maxOccupancy) >= guestCount
```

Pricing supplies `pricePerRoomStay` for one room across the complete requested stay.

For a complete quote, Pricing also supplies every applied Room Rate in chronological order. When a stay starts inside one rate and ends inside a later rate, all overlapping rates are included. Booking does not recalculate the rate intersections or nightly subtotals.

Option item subtotal:

```text
itemSubtotal = quantity * pricePerRoomStay
```

Option total:

```text
totalPrice = sum(itemSubtotal)
```

Generate combinations by Room Type index so the same unordered combination is emitted once.

Filter candidates before combination generation:

- Active Room Type only.
- Positive available quantity.
- Complete Pricing coverage for every night.

Prune branches when:

- Remaining candidates cannot fill the requested room count.
- Maximum reachable capacity cannot satisfy the guest count.
- An approved bounded top-result strategy can prove the branch cannot beat retained results.

Sort complete options by `totalPrice ASC`.

### Option Output

#### Accepted

Each option item contains:

- Public Room Type information.
- Selected quantity.
- Room Type maximum occupancy.
- Current available quantity.
- Price for one room across the complete stay.
- Item subtotal.
- Active facilities.

Each complete option contains:

- Items.
- Total room quantity.
- Total capacity.
- Total price.

Booking owns this response composition. Pricing returns Pricing-owned quote results, not Booking response DTOs.

### Bulk Read Flow

#### Accepted Direction

```text
Public Availability Controller
    -> Booking Availability Service
        -> Room Catalog availability query
        -> Booking reservation commitment query
        -> Pricing bulk quote contract
        -> Room Catalog facility query
```

Use bulk reads. Do not query Room Catalog or Pricing once per Room Type.

Facility enrichment may occur after option pagination if one bulk query loads every unique Room Type ID present on the selected page.

### Open

The future Booking plan must explicitly decide:

- Maximum accepted `roomQuantity`.
- Maximum number of candidate Room Types.
- Whether to enumerate all valid combinations or retain only the cheapest `K` options.
- How pagination total counts behave when the result set is bounded.
- Deterministic tie-breakers after `totalPrice ASC`.

A maximum `roomQuantity` of `10` was suggested but not accepted.

Suggested, but not accepted, tie-breakers are fewer distinct Room Types first and then a stable Room Type key.

## Check-In

### Accepted

Check-in is all-or-nothing for the complete Reservation.

Requirements:

- Reservation status is `CONFIRMED`.
- Current hotel-local date is at least `checkInDate` and earlier than `checkOutDate`.
- Late check-in is allowed until before `checkOutDate`.
- Receptionist supplies enough distinct physical Room IDs for every Reservation Item quantity.
- Every assigned room matches the expected Room Type.
- Every assigned room is `READY`.
- No assigned room belongs to another active check-in.
- When an outstanding amount exists, check-in accepts a counter payment method and records the exact difference before completion.
- Check-in is rejected while any outstanding amount remains unpaid.
- Assignment writes and the transition to `CHECKED_IN` occur atomically after all required validation and payment recording succeeds.

### Open

- PostgreSQL locking strategy for physical rooms, assignments, Reservation state, and Payment coordination.
- Stable error code and staff recovery workflow when enough `READY` rooms cannot be assigned.

`ROOM_ASSIGNMENT_UNAVAILABLE` is a proposed error code, not an accepted final contract.

## Check-Out

### Accepted

Check-out is all-or-nothing for the complete Reservation.

Rules:

- Early check-out is allowed.
- Early check-out does not recalculate price.
- Early check-out does not create a refund.
- Transition the Reservation to `CHECKED_OUT`.
- Transition every assigned physical room to `DIRTY` through a Room Catalog public contract.
- Preserve Room Assignment rows as history.
- Publish a post-commit event for Housekeeping task creation.
- Housekeeping event handling failure must not roll back a completed check-out.

### Open

- Event type, payload, delivery guarantees, retry behavior, and duplicate handling.
- Whether the first implementation uses an in-process event only or also requires an outbox.

## Cancellation and Refund

### Accepted

- Customer may cancel an owned Reservation before check-in.
- Receptionist may cancel a Reservation before check-in.
- Cancellation immediately transitions the Reservation to `CANCELLED` and releases its inventory commitment.
- If completed payments exist, request a mock full refund transaction with status `SUCCEEDED`.
- An unpaid pending cancellation has no refund.
- Mock refund failure does not restore the Reservation or inventory commitment.
- Cancellation is not allowed after `CHECKED_IN`.

### Open

- Operational handling and retry visibility for a refund that fails after cancellation commits.
- Exact cancellation-reason values beyond `PAYMENT_TIMEOUT` and `NO_SHOW`.

## No-Show

### Accepted

- Receptionist may mark no-show from `checkInDate` until before `checkOutDate`.
- Only a `CONFIRMED` Reservation may be marked no-show.
- No-show transitions the Reservation to `CANCELLED` with reason `NO_SHOW`.
- No-show produces no refund.
- Do not add a `NO_SHOW` Reservation status.
- Do not automatically mark no-show based only on clock time.

## Authorization and API Capabilities

### Public

#### Accepted

- Search availability.

### Customer

#### Accepted

- Create a Reservation.
- Edit an owned pending Reservation.
- Pay an owned pending Reservation.
- List owned Reservations.
- View an owned Reservation.
- Cancel an owned Reservation before check-in.

Customer cannot:

- Confirm manually.
- Edit a confirmed Reservation.
- Assign physical rooms.
- Check in.
- Check out.
- Mark no-show.

### Receptionist

#### Accepted

- List and filter all Reservations.
- View Reservation details.
- Create a Reservation for an existing Customer.
- Edit pending and confirmed Reservations under the accepted lifecycle rules.
- Confirm a pending Reservation with counter payment.
- Cancel before check-in.
- Check in.
- Check out.
- Mark no-show.

### Hotel Manager

#### Accepted

- View Reservations.
- No Booking availability override.
- No Booking payment override.

Pricing management belongs to Pricing, not Booking.

### Administrator

#### Accepted

- No Booking operational actions are currently accepted.

Pricing management belongs to Pricing, not Booking.

### Other Roles

#### Accepted

Housekeeping Staff and Maintenance Staff have no Booking HTTP API scope in the accepted MVP design.

### Staff Reservation Filters

#### Accepted

- Confirmation code.
- Customer.
- Reservation status.
- Check-in date.
- Check-out date.
- Pagination.

Customer Reservation output may show assigned room numbers after check-in. Before check-in it shows Room Types only.

### Open

- Exact route paths, HTTP methods, request DTOs, response DTOs, pagination defaults, and Swagger contracts.
- Whether Administrator receives read-only Reservation access in a later scope.

## Concurrency and Transaction Principles

### Accepted

- Availability search is a read-only snapshot and never reserves inventory.
- Reservation creation and edits repeat availability and Pricing checks inside the write transaction.
- Transactional writes use repositories created from the provided transaction manager only.
- When multiple identifiers must be locked, sort them before acquiring locks.
- Search alone must never be described as protection against concurrent overselling.
- Commercial overbooking and later operational capacity loss are different problems.
- Check-in revalidates physical-room assignability instead of assuming the earlier Reservation commitment guarantees a `READY` room.

### Open

The Booking plan must define a PostgreSQL-safe strategy for:

- Initial pending Reservation creation.
- Pending Reservation edits.
- Confirmed edits that change or increase inventory.
- Pending expiration racing with payment.
- Payment callback racing with manual cancellation.
- Check-in assignment racing with operational room-status changes.
- Concurrent check-in attempts using the same physical room.

The plan must state the lock targets, lock order, isolation assumptions, retry behavior, and transaction boundaries. It must not rely on an availability table as a substitute for concurrency control.

## Post-Booking Operational Capacity Loss

### Accepted Problem Statement

A valid Reservation may become operationally difficult after a physical room is changed to `OUT_OF_SERVICE` or `RETIRED`. Preventing concurrent commercial overselling does not solve this later physical-room shortage.

An inventory table alone would not solve the problem because the missing capacity is a physical operational fact.

### Open Proposals

These proposals require explicit approval in the future Booking or Room Catalog integration plan:

- Reject planned room retirement when future commitments would exceed remaining sellable capacity.
- Use a stable conflict such as `ROOM_CAPACITY_COMMITTED` for that rejection.
- Allow an emergency `OUT_OF_SERVICE` transition for safety even when it creates a future shortage.
- Surface operational shortages to staff for resolution.
- Revalidate sufficient `READY` rooms by Room Type during check-in.
- Return a stable conflict such as `ROOM_ASSIGNMENT_UNAVAILABLE` when assignment cannot complete.

Do not report any of these proposals as implemented or approved final behavior.

## Cross-Module Contract Needs

### Room Catalog

Booking needs intentional bulk contracts for:

- Active Room Type facts and maximum occupancy.
- Sellable physical-room counts by Room Type and operational status.
- Active facilities for availability output.
- Physical-room detail and status validation during assignment.
- Atomic or transaction-aware room-status changes during check-out.

The exact contract split and transaction participation remain open for the Booking plan.

### Pricing

#### Accepted

Booking uses the bulk quote contract defined by `docs/features/pricing/PLAN.md`.

Booking:

- Requests quotes by distinct Room Type IDs and date range.
- Rejects Reservation creation or editing when any selected Room Type is unquoted.
- Receives every applied Room Rate and its intersection with the requested stay for each complete quote.
- Calculates item subtotals from `pricePerRoomStay * quantity`.
- Stores accepted Reservation and Reservation Item price snapshots.
- Re-requests quotes during Reservation writes.

Pricing does not compose availability options or Booking DTOs.

### Customer

Booking needs public contracts to:

- Resolve a Customer owned by the authenticated account.
- Create the first Customer profile for an online booking.
- Resolve an existing Customer selected by Receptionist.

Customer does not expose its TypeORM entities or repository.

### Payment

Booking needs public contracts for:

- Creating or replacing a mock online payment intent.
- Recording counter payments.
- Handling idempotent provider success callbacks.
- Reading completed paid amounts when required.
- Creating full mock refunds.

Payment does not import Booking.

### Housekeeping

Booking publishes a post-commit check-out event containing identifiers and facts required to create cleaning work. It does not pass TypeORM entities.

## Explicit MVP Exclusions

The following are excluded:

- Separate `inventory-availability` module.
- Separate `reservation` module.
- Separate `stay` module.
- Availability table or daily inventory ledger.
- Scheduled future maintenance blocks.
- Commercial overbooking.
- Deposit.
- Partial initial payment.
- Partial cancellation.
- Partial check-in.
- Partial check-out.
- Guest booking without an account.
- Guest identity-document collection.
- Individual guest lists.
- Per-room guest allocation.
- Customer selection of physical room numbers.
- Tax.
- Service fee.
- Promotion.
- Voucher.
- Discount.
- Rate plans.
- Multi-currency.
- Real payment gateway.
- Hard deletion of Reservations.
- Customer edits to confirmed Reservations.
- Reservation Amendment entity.
- Hotel Manager availability override.
- Hotel Manager payment override.
- Automated no-show based only on time.
- Reporting.
- Notification.
- Invoice.

## Implementation Preconditions and Order

### Accepted

- Complete and approve the Pricing boundary and bulk quote contract before Booking implementation depends on it.
- Create a separate Booking `PLAN.md` and `TASK.md` checkpoint before implementation.
- Resolve dependency sequencing because Customer, Payment, and Housekeeping modules do not currently exist.
- Do not silently create broad fake Customer, Payment, or Housekeeping modules during Pricing work.
- Keep one coherent, reviewable Booking checkpoint at a time.

### Open

- Whether Customer and Payment must be implemented before Booking or whether narrow explicitly approved placeholder contracts are acceptable.
- The Booking milestone order.
- The required automated test scope for Booking.
- Whether any PostgreSQL integration tests are required for high-risk concurrency behavior.

## Current Verification State

- No Booking source code exists.
- No Booking migration exists.
- No Booking test exists.
- No Booking `PLAN.md` exists.
- No Booking `TASK.md` exists.
- The availability combination algorithm is accepted design guidance only.
- Concurrency, operational-shortage, and cross-module failure behavior remain unverified.

This file is the detailed decision record, not evidence of implementation.
