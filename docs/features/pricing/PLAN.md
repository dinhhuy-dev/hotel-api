# Pricing Feature Plan

## Status

Milestone 1 is approved. Milestones 2 and 3 are implemented and awaiting review. The internal bulk quote contract in Milestone 4 has not been implemented.

This plan defines Pricing independently from the future Booking implementation. Work proceeds one milestone at a time, with a review checkpoint after each milestone.

## Goal

Implement single-hotel nightly pricing for active Room Types and expose a bulk internal quote contract that Booking can use later.

Pricing owns date-ranged room rates. It does not own availability, reservations, customers, payments, room details, or physical-room capacity.

## Scope

The first Pricing implementation provides:

- Management CRUD for future Room Rate ranges.
- Read access to past, current, and future Room Rate ranges for management users.
- VND integer prices for each night in a half-open date range.
- A database-enforced non-overlap rule per Room Type.
- A bulk internal quote contract for Room Type IDs and a requested stay.
- A minimal public Room Catalog contract for validating active Room Type IDs.

## Non-Goals

The first implementation does not include:

- A public Pricing HTTP search API.
- Availability calculation or option composition.
- Reservations or reservation price snapshots.
- Taxes, service fees, promotions, vouchers, or discounts.
- Rate plans, occupancy-based pricing, or guest-based pricing.
- Multiple currencies or decimal monetary amounts.
- Multiple hotels, branches, tenancy fields, or a `hotelId`.
- Seasonal recurrence rules or automatic rate generation.
- Per-night reservation price rows.
- Scheduled jobs or rate publication workflows.
- Customer, Payment, Housekeeping, or Booking dependencies.

Booking will expose customer-facing prices through availability results. Booking planning remains separate and must resolve its own combination bounds, operational-capacity policy, and transaction strategy.

## Authorization

| Operation                        | Administrator | Hotel Manager | Other roles   |
| -------------------------------- | ------------- | ------------- | ------------- |
| Create a future Room Rate        | Allowed       | Allowed       | Denied        |
| List and view Room Rates         | Allowed       | Allowed       | Denied        |
| Update an unstarted Room Rate    | Allowed       | Allowed       | Denied        |
| Hard delete an unstarted rate    | Allowed       | Allowed       | Denied        |
| Call the internal quote contract | Internal only | Internal only | Internal only |

The global authentication guard protects management routes. `ManagementRoomRateController` lists Administrator and Hotel Manager explicitly through `@Roles`.

## Data Model

### Room Rate

Table: `room_rates`

| Column            | Rule                                                    |
| ----------------- | ------------------------------------------------------- |
| `id`              | UUID primary key                                        |
| `room_type_id`    | UUID identifier for a Room Catalog Room Type            |
| `start_date`      | PostgreSQL `date`, inclusive                            |
| `end_date`        | PostgreSQL `date`, exclusive                            |
| `price_per_night` | PostgreSQL `integer`, VND, from 1 through 2,147,483,647 |
| `created_at`      | Timestamp with time zone                                |
| `updated_at`      | Timestamp with time zone                                |

Pricing stores `roomTypeId` as an identifier. Its TypeORM entity must not define a relationship to or import the Room Catalog entity. The migration may add a restrictive foreign key from `room_rates.room_type_id` to `room_types.id` because both modules share PostgreSQL.

Database checks enforce:

- `start_date < end_date`.
- `price_per_night > 0`.
- No overlapping date ranges for the same Room Type.

The non-overlap guarantee uses PostgreSQL `btree_gist` and an exclusion constraint equivalent to:

```sql
EXCLUDE USING gist (
  room_type_id WITH =,
  daterange(start_date, end_date, '[)') WITH &&
)
```

The migration creates the extension with `CREATE EXTENSION IF NOT EXISTS btree_gist` before creating the constraint. Migration execution must fail clearly if the database role cannot install or use the required extension. The application uses an overlap pre-check for its expected management flow. The exclusion constraint remains a database integrity rule, but Pricing does not map its database error into an application conflict.

## Date and Amount Rules

- API and internal contract dates use strict ISO calendar strings in `YYYY-MM-DD` form.
- Rate and stay ranges use `[startDate, endDate)`. The check-out date does not consume a night.
- The business timezone is `Asia/Ho_Chi_Minh`. Audit timestamps remain UTC.
- Pricing obtains the current hotel-local date through an injectable clock so service tests do not depend on the machine timezone.
- Creating a rate requires `startDate` to be later than the current hotel-local date.
- A rate is unstarted only while `startDate` is later than the current hotel-local date.
- Currently effective and past rates are read-only and cannot be hard deleted.
- Updating a rate may change `startDate`, `endDate`, and `pricePerNight`, but not `roomTypeId`.
- An updated range must remain in the future and satisfy every overlap and amount rule.
- VND values are integers. Floating-point, decimal, negative, and zero prices are rejected.
- A stay may cross multiple adjacent Room Rate ranges.
- Every night in `[checkInDate, checkOutDate)` must have exactly one applicable rate for the Room Type to be quotable.
- `pricePerRoomStay` is the safe-integer sum of all applicable nightly prices for one room.

Existing rates remain as pricing history if a Room Type is later deactivated. New rates and updates still require the referenced Room Type to be active at command validation time.

## Room Catalog Public Contract

Pricing depends on Room Catalog through a minimal module-owned query contract. Room Catalog remains independent from Pricing.

The contract accepts one Room Type ID and returns a module-owned record containing only the facts Pricing needs, or `null` when the Room Type does not exist:

```ts
interface PricingRoomTypeRecord {
  readonly id: string;
  readonly isActive: boolean;
}
```

Pricing uses this contract for management validation. It must not import a Room Catalog controller, entity, repository, or internal service. The Room Catalog module exports only the intentional query token, implemented directly by its existing `RoomTypeService`.

Unknown Room Type IDs produce `ROOM_TYPE_NOT_FOUND`. Inactive Room Types produce `INACTIVE_ROOM_TYPE` for create and update commands.

## Internal Bulk Quote Contract

Pricing exports an intentional `PricingQuoteService` or equivalent contract from `PricingModule`. It is not exposed through an HTTP controller.

The request contains:

```ts
interface BulkRoomTypeQuoteRequest {
  readonly roomTypeIds: readonly string[];
  readonly checkInDate: string;
  readonly checkOutDate: string;
}
```

Rules:

- `roomTypeIds` must be non-empty, distinct UUIDs.
- `checkInDate` must be earlier than `checkOutDate`.
- The contract performs bulk reads, not one query per Room Type or one query per night.
- Pricing does not apply Booking's public-search rules such as guest count, room quantity, or the 30-night maximum.
- The contract reads every stored Room Rate that overlaps the requested stay range.
- A complete quote returns every applied Room Rate in chronological order, not only the first matching range or an aggregated total.
- Pricing returns a complete quote only when every requested night has exactly one rate.
- Missing rate coverage does not create a partial price.
- Pricing returns no Room Catalog or Booking DTOs.

The result contains:

```ts
interface BulkRoomTypeQuoteResult {
  readonly quotes: readonly RoomTypeStayQuote[];
  readonly unquotedRoomTypeIds: readonly string[];
}

interface RoomTypeStayQuote {
  readonly roomTypeId: string;
  readonly pricePerRoomStay: number;
  readonly appliedRates: readonly AppliedRoomRate[];
}

interface AppliedRoomRate {
  readonly roomRateId: string;
  readonly rateStartDate: string;
  readonly rateEndDate: string;
  readonly appliedStartDate: string;
  readonly appliedEndDate: string;
  readonly pricePerNight: number;
  readonly nightCount: number;
  readonly subtotal: number;
}
```

Both result arrays follow the input Room Type order. Each quote's `appliedRates` follow `appliedStartDate ASC` and include every stored range that overlaps the requested stay. `rateStartDate` and `rateEndDate` preserve the complete stored Room Rate boundaries. `appliedStartDate` and `appliedEndDate` contain the intersection between that Room Rate and `[checkInDate, checkOutDate)`.

For example, assume the stored rates are `[2026-09-01, 2026-09-05)`, `[2026-09-05, 2026-09-10)`, and `[2026-09-10, 2026-09-15)`. A stay of `[2026-09-03, 2026-09-12)` returns all three in `appliedRates`. The first applied range is `[2026-09-03, 2026-09-05)`, and the third is `[2026-09-10, 2026-09-12)`. Clipping applies only to `nightCount` and `subtotal` calculation. The stored rate boundaries are not altered.

`pricePerRoomStay` equals the sum of every applied-rate subtotal. Booking may multiply it by the requested quantity and store Reservation snapshots later. Pricing does not calculate Booking item subtotals or option totals.

If coverage contains a gap, Pricing places the Room Type ID in `unquotedRoomTypeIds` and does not return an incomplete `RoomTypeStayQuote` or partial total for it.

## Management HTTP API

Controller prefix:

```text
/api/v1/pricing/management/room-rates
```

Routes:

| Method   | Route                                       | Behavior                                      |
| -------- | ------------------------------------------- | --------------------------------------------- |
| `POST`   | `/api/v1/pricing/management/room-rates`     | Create a future Room Rate                     |
| `GET`    | `/api/v1/pricing/management/room-rates`     | List all visible rate history with pagination |
| `GET`    | `/api/v1/pricing/management/room-rates/:id` | View one Room Rate                            |
| `PATCH`  | `/api/v1/pricing/management/room-rates/:id` | Update an unstarted Room Rate                 |
| `DELETE` | `/api/v1/pricing/management/room-rates/:id` | Hard delete an unstarted Room Rate            |

Create, detail, and update return a Room Rate response DTO. Delete returns no business object and uses the project's void success response contract.

List query parameters:

- `page`, default `1`.
- `limit`, default `10`, maximum `50`.
- Optional `roomTypeId` UUID.
- Optional `fromDate` and `toDate`, which must be supplied together and define a valid half-open filter window.

When both date filters are present, the list returns every stored Room Rate that overlaps `[fromDate, toDate)`. Overlap uses:

```text
roomRate.startDate < toDate
and roomRate.endDate > fromDate
```

The endpoint returns each complete stored Room Rate. It does not clip rate boundaries to the filter window, merge adjacent rates, aggregate prices, or select only one matching rate.

For example, assume the stored rates are `[2026-09-01, 2026-09-05)`, `[2026-09-05, 2026-09-10)`, and `[2026-09-10, 2026-09-15)`. Filtering with `fromDate=2026-09-03` and `toDate=2026-09-12` returns all three complete Room Rates. Pagination and `totalItems` are calculated after applying the overlap filter.

Results sort by `startDate DESC`, then `roomTypeId ASC`, then `id ASC`. Controllers return a real `PaginatedResult<RoomRateResponseDto>`.

There is no public or customer Pricing controller.

## Validation

- Route identifiers and `roomTypeId` values are UUIDs.
- Calendar dates are valid strict `YYYY-MM-DD` values.
- `startDate` is earlier than `endDate`.
- Create and update ranges begin after the current hotel-local date.
- `pricePerNight` is an integer from 1 through 2,147,483,647.
- A patch request changes at least one mutable field.
- List date filters are either both absent or both present and valid.
- Bulk quote Room Type IDs are unique and non-empty.

Database constraints remain the final protection for referential integrity, positive prices, valid ranges, and non-overlap.

## Error Contract

Pricing follows the existing standard-module HTTP error convention with safe messages and stable `error` codes.

Expected codes include:

- `ROOM_RATE_NOT_FOUND`
- `ROOM_TYPE_NOT_FOUND`
- `INACTIVE_ROOM_TYPE`
- `ROOM_RATE_OVERLAP`
- `ROOM_RATE_ALREADY_STARTED`
- `INVALID_ROOM_RATE_RANGE`
- `INVALID_ROOM_RATE_UPDATE`
- `INVALID_QUOTE_RANGE`

Status mapping:

- `400`: Invalid DTO, calendar date, date range, price, or empty update.
- `401`: Missing or invalid authentication.
- `403`: Authenticated role is not allowed.
- `404`: Room Rate or Room Type does not exist.
- `409`: Inactive Room Type, overlapping range, or attempted mutation of a started rate.

The service returns `ROOM_RATE_OVERLAP` after using the repository overlap query for its application pre-check. PostgreSQL exclusion-constraint violations are not mapped because they are outside the expected serial management flow.

## Module Structure

Pricing uses the standard NestJS layered structure:

```text
src/modules/pricing/
|-- controller/
|-- dto/
|-- entities/
|-- repositories/
|   |-- ports/
|   `-- typeorm/
|-- services/
`-- pricing.module.ts
```

Responsibility split:

- `ManagementRoomRateController` handles management HTTP input and output.
- Request DTOs use built-in `class-validator` decorators for field-level format, type, and value rules.
- `RoomRateService` applies cross-field, current-date, Room Type state, overlap, and management lifecycle rules.
- `PricingQuoteService` implements the bulk internal quote contract.
- `RoomRateRepositoryPort` exposes only Pricing persistence operations and data queries.
- The TypeORM adapter reads and writes Pricing data without deciding application errors.

Do not create one broad service that combines management, quotes, Room Catalog reads, and future Booking behavior.

## Transactions and Concurrency

- Pricing management operations are assumed to execute serially in the single-hotel operating model.
- Create and update perform an overlap pre-check before writing.
- Create, update, and delete are single-record management writes and do not use application transactions or row locks.
- The PostgreSQL exclusion constraint remains a schema integrity rule. Pricing does not map its database violation because it is not an expected application path under the serial-operation assumption.
- Quote operations are read-only snapshots and do not lock or reserve rates.
- Booking must re-request Pricing quotes inside its own future reservation transaction and store accepted snapshots. A prior availability response is not a price guarantee.

## Swagger

Every management route documents request DTOs, query DTOs, response DTOs, bearer authentication, role-relevant failures, and the runtime response envelope.

List routes use `ApiPaginatedSuccessResponse`. Object routes use `ApiSuccessResponse`. Delete uses the shared void response decorator. Swagger does not expose the internal quote contract as an HTTP operation.

## Testing Strategy

The required automated scope is controller and service unit tests only, matching the current user-approved feature-testing boundary.

- `RoomRateService` tests cover active Room Type validation, future-only mutations, overlap pre-check results, multi-range date filtering, and response mapping.
- `PricingQuoteService` tests cover single and multiple applied rate ranges, complete coverage, clipped first and last applied boundaries, gaps, bulk ordering, invalid input, and integer totals.
- Controller tests cover delegation, RBAC metadata, route metadata, pagination, Swagger response metadata, and the absence of a public Pricing controller.
- The Room Catalog public-contract service receives focused service unit coverage.
- Repository adapter, DTO, module-wiring, migration, PostgreSQL integration, and E2E tests are outside the required completion scope unless the user expands it.
- Any optional database-specific verification must use PostgreSQL, especially for `btree_gist`, exclusion constraints, and `date` behavior.
- Relevant ESLint, Prettier, Nest build, and `git diff --check` verification must pass.

No future implementation checkpoint may claim that the exclusion constraint or migration works in PostgreSQL unless it is actually executed against PostgreSQL.

## Milestones

### Milestone 1 - Planning and Tracking

- Align the architecture module landscape with separate Pricing and consolidated Booking contexts.
- Define Pricing ownership, persistence rules, authorization, management API, and bulk quote contract.
- Create this plan and `TASK.md`.
- Record the active paths in `PROGRESS.md`.
- Run focused documentation verification.
- Stop for review before implementation.

### Milestone 2 - Persistence and Room Catalog Contract

- Add the minimal Room Catalog query contract required by Pricing.
- Add the Pricing migration, Room Rate entity, repository port, and TypeORM adapter.
- Add the injectable hotel-local clock used by Pricing rules.
- Add the Pricing module wiring required by the persistence foundation.
- Run focused static verification and required service tests.
- Stop for review.

### Milestone 3 - Room Rate Management

- Add management request, query, and response DTOs.
- Implement create, list, detail, update, and hard-delete rules.
- Return every complete stored Room Rate that overlaps the optional management date-filter window.
- Add `ManagementRoomRateController` with Administrator and Hotel Manager RBAC.
- Add controller and service unit tests.
- Run focused verification and stop for review.

### Milestone 4 - Internal Bulk Quote Contract

- Implement and export the Pricing bulk quote contract.
- Add complete-coverage and bulk aggregation queries.
- Return every applied Room Rate and its requested-stay intersection for each complete quote.
- Add quote service unit tests for boundary and gap cases.
- Verify that no public Pricing HTTP route or Booking dependency was added.
- Run focused verification and stop for review.

### Milestone 5 - Feature Verification and Documentation Review

- Run the full Pricing controller and service unit-test set.
- Run relevant lint, format, Nest build, and diff checks.
- Review Swagger metadata, module boundaries, and public exports.
- Record exact verification evidence in `TASK.md` and `PROGRESS.md`.
- Mark Pricing complete under the approved scope and stop for review.

## Definition of Done

Pricing is complete only when:

- Every required task in `TASK.md` is complete.
- Future Room Rates can be managed under the approved authorization and lifecycle rules.
- Management date filtering returns every complete stored Room Rate that overlaps the requested filter window.
- PostgreSQL schema definitions include the approved date, amount, foreign-key, and exclusion constraints.
- The bulk quote contract returns only complete stay prices and every applied Room Rate through bulk reads.
- No public Pricing search API or Booking behavior is introduced.
- Required controller and service unit tests pass.
- Relevant lint, format, Nest build, and diff checks pass.
- Swagger matches the implemented management API.
- `PROGRESS.md` records the final status and verification evidence.
