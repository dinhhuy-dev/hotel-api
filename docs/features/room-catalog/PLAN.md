# Room Catalog Feature Plan

## Status

Planning is complete. Milestone 2 is approved under the current test scope. Milestone 3 facility management is next.

This plan is the approved source of truth for the first `room-catalog` implementation. Work must proceed one milestone at a time, with a review checkpoint after each milestone.

## Goal

Implement a single-hotel room catalog that manages room types, facilities, and physical rooms.

The module provides:

- Public access to active room type information.
- Staff access to non-retired physical room information.
- Management operations for administrators and hotel managers.
- Current physical room operational status.

## Non-Goals

The first implementation does not include:

- Multiple hotels, branches, tenancy fields, or a `hotelId`.
- Room prices or pricing placeholders.
- Date-based inventory or availability.
- Reservations, stays, room assignments, or occupancy state.
- Customer or guest information.
- Room images or file uploads.
- Audit history or room status history.
- Seeded room types, facilities, or rooms.
- In-process events.
- A public NestJS contract for another module.

The future dependency direction is:

```text
pricing -> room-catalog
inventory-availability -> room-catalog
inventory-availability -> pricing
```

`room-catalog` remains a catalog-only module. Future modules provide richer customer-facing projections without adding reverse dependencies from `room-catalog`.

## Authorization

| Operation                                | Allowed caller                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| Read active room types                   | Public, including unauthenticated callers                                         |
| Read non-retired physical rooms          | Administrator, Hotel Manager, Receptionist, Housekeeping Staff, Maintenance Staff |
| Manage room types, facilities, and rooms | Administrator, Hotel Manager                                                      |

The physical-room routes must list all five staff roles explicitly. The existing role guard does not support a negative role rule such as "all except customer."

## Data Model

### Room Type

Table: `room_types`

| Column              | Rule                                           |
| ------------------- | ---------------------------------------------- |
| `id`                | UUID primary key                               |
| `code`              | `varchar(20)`, normalized to uppercase, unique |
| `name`              | `varchar(100)`, trimmed                        |
| `description`       | `varchar(1000)`, nullable                      |
| `max_occupancy`     | Integer from 1 to 20                           |
| `bed_configuration` | `varchar(200)`, nullable                       |
| `display_order`     | Non-negative integer, required                 |
| `is_active`         | Boolean, defaults to `true`                    |
| `created_at`        | Timestamp with time zone                       |
| `updated_at`        | Timestamp with time zone                       |

Room type codes are immutable after creation. Names do not need to be unique. Public lists sort by `display_order ASC, name ASC`.

### Facility

Table: `facilities`

| Column        | Rule                                                     |
| ------------- | -------------------------------------------------------- |
| `id`          | UUID primary key                                         |
| `name`        | `varchar(100)`, trimmed, unique without case sensitivity |
| `description` | `varchar(500)`, nullable                                 |
| `is_active`   | Boolean, defaults to `true`                              |
| `created_at`  | Timestamp with time zone                                 |
| `updated_at`  | Timestamp with time zone                                 |

A database index on `LOWER(name)` enforces case-insensitive uniqueness while preserving display casing.

### Room Type Facility

Table: `room_type_facilities`

| Column         | Rule                           |
| -------------- | ------------------------------ |
| `room_type_id` | Foreign key to `room_types.id` |
| `facility_id`  | Foreign key to `facilities.id` |

The two columns form the composite primary key. Business foreign keys use restrictive deletion behavior.

### Physical Room

Table: `rooms`

| Column               | Rule                                           |
| -------------------- | ---------------------------------------------- |
| `id`                 | UUID primary key                               |
| `room_number`        | `varchar(20)`, normalized to uppercase, unique |
| `floor`              | `varchar(10)`, normalized to uppercase         |
| `room_type_id`       | Foreign key to an active room type             |
| `operational_status` | PostgreSQL enum, defaults to `OUT_OF_SERVICE`  |
| `created_at`         | Timestamp with time zone                       |
| `updated_at`         | Timestamp with time zone                       |

Operational statuses are:

- `READY`
- `DIRTY`
- `CLEANING`
- `OUT_OF_SERVICE`
- `RETIRED`

Room numbers may be changed while the room is not retired, but the new value must remain unique. A room type may be changed only while the room is `OUT_OF_SERVICE`, and the target room type must be active.

## Lifecycle Rules

### Room Type

- `DELETE` deactivates the room type instead of deleting its row.
- Deactivation is rejected while any related room is not `RETIRED`.
- Restore is rejected while any related facility is inactive.
- Restore does not restore related rooms or facilities automatically.
- An inactive room type code cannot be reused by a new room type.

### Facility

- `DELETE` deactivates the facility instead of deleting its row.
- Deactivation is rejected while the facility is assigned to an active room type.
- An inactive facility name cannot be reused by a new facility.

### Physical Room

- A new room starts as `OUT_OF_SERVICE`.
- `DELETE` transitions any non-retired room to `RETIRED`.
- `RETIRED` cannot be submitted through the normal status DTO.
- Restore is allowed only for a retired room whose room type is active.
- Restore always transitions the room to `OUT_OF_SERVICE`.
- A retired room number cannot be reused by a new room.

Allowed operational transitions are:

```text
READY -> DIRTY | OUT_OF_SERVICE
DIRTY -> CLEANING | OUT_OF_SERVICE
CLEANING -> READY | OUT_OF_SERVICE
OUT_OF_SERVICE -> DIRTY
RETIRED -> OUT_OF_SERVICE through restore only
```

Submitting the current status again succeeds as an idempotent no-op.

## Facility Assignment Rules

- Room type creation may include an optional list of active facility IDs.
- General room type updates do not accept facility IDs.
- Facility additions and removals use separate bulk endpoints.
- Adding an already assigned facility is a successful no-op.
- Removing an unassigned facility is a successful no-op.
- If any submitted facility ID is missing or inactive, the entire add operation fails.
- Each bulk operation is atomic.

## HTTP API

The application global prefix is `/api`. Room catalog controllers use the `v1/room-catalog` prefix, producing `/api/v1/room-catalog` routes.

### Public Room Types

- `GET /api/v1/room-catalog/room-types`
- `GET /api/v1/room-catalog/room-types/:id`

Only active room types are visible. An inactive or unknown room type returns `404`.

Public list items contain:

- `id`
- `code`
- `name`
- `maxOccupancy`
- `bedConfiguration`
- `displayOrder`

Public detail responses also contain `description` and `facilities`. They do not expose lifecycle flags or timestamps.

### Staff Rooms

- `GET /api/v1/room-catalog/rooms`
- `GET /api/v1/room-catalog/rooms/:id`

Retired rooms are not visible through staff routes. A retired or unknown room returns `404`.

Staff room responses contain:

- `id`
- `roomNumber`
- `floor`
- `operationalStatus`
- Room type `id`, `code`, `name`, `maxOccupancy`, `bedConfiguration`, and facilities

They never contain reservation, stay, customer, or guest information.

### Management Room Types

- `POST /api/v1/room-catalog/management/room-types`
- `GET /api/v1/room-catalog/management/room-types`
- `GET /api/v1/room-catalog/management/room-types/:id`
- `PATCH /api/v1/room-catalog/management/room-types/:id`
- `DELETE /api/v1/room-catalog/management/room-types/:id`
- `PATCH /api/v1/room-catalog/management/room-types/:id/restore`
- `POST /api/v1/room-catalog/management/room-types/:id/facilities/add`
- `POST /api/v1/room-catalog/management/room-types/:id/facilities/remove`

### Management Facilities

- `POST /api/v1/room-catalog/management/facilities`
- `GET /api/v1/room-catalog/management/facilities`
- `GET /api/v1/room-catalog/management/facilities/:id`
- `PATCH /api/v1/room-catalog/management/facilities/:id`
- `DELETE /api/v1/room-catalog/management/facilities/:id`
- `PATCH /api/v1/room-catalog/management/facilities/:id/restore`

### Management Rooms

- `POST /api/v1/room-catalog/management/rooms`
- `GET /api/v1/room-catalog/management/rooms`
- `GET /api/v1/room-catalog/management/rooms/:id`
- `PATCH /api/v1/room-catalog/management/rooms/:id`
- `PATCH /api/v1/room-catalog/management/rooms/:id/status`
- `DELETE /api/v1/room-catalog/management/rooms/:id`
- `PATCH /api/v1/room-catalog/management/rooms/:id/restore`

Management responses include lifecycle flags where applicable, timestamps, retired rooms, and complete room type facility information.

## Query Rules

All list endpoints are paginated.

Request defaults:

- `page`: `1`
- `limit`: `10`
- Maximum `limit`: `50`

The response interceptor receives a `PaginatedResult<T>` and emits:

- `page`
- `pageSize`
- `totalItems`
- `totalPages`

Supported queries include:

- Room types: search by code or name, filter by lifecycle in management routes.
- Rooms: search by room number, filter by room type, floor, operational status, and retired state where authorized.
- Facilities: search by name, filter by lifecycle in management routes.

## Validation

- Room type code: trim, uppercase, 2 to 20 characters, `A-Z`, `0-9`, `_`, and `-` only.
- Room type name: trim, 2 to 100 characters.
- Description: at most 1000 characters and nullable.
- Maximum occupancy: integer from 1 to 20.
- Bed configuration: at most 200 characters and nullable.
- Display order: non-negative integer.
- Room number: trim, uppercase, 1 to 20 characters.
- Floor: trim, uppercase, 1 to 10 characters.
- Facility name: trim, 2 to 100 characters.
- Facility description: at most 500 characters and nullable.
- Route identifiers: valid UUIDs.

Database constraints remain the final protection for uniqueness and referential integrity.

## Error Contract

Standard business module services may throw NestJS HTTP exception subclasses directly. The exception payload uses the existing `error` property as a stable machine-readable code.

Status mappings are:

- `400`: Invalid request or query DTO.
- `401`: Missing or invalid authentication.
- `403`: Authenticated role is not allowed.
- `404`: Resource is missing or hidden from the caller.
- `409`: Duplicate value, inactive dependency, or resource still in use.
- `422`: Invalid operational status transition.

Expected error codes include:

- `ROOM_TYPE_NOT_FOUND`
- `ROOM_NOT_FOUND`
- `FACILITY_NOT_FOUND`
- `DUPLICATE_ROOM_TYPE_CODE`
- `DUPLICATE_ROOM_NUMBER`
- `DUPLICATE_FACILITY_NAME`
- `ROOM_TYPE_IN_USE`
- `FACILITY_IN_USE`
- `INACTIVE_ROOM_TYPE`
- `INACTIVE_FACILITY`
- `INVALID_ROOM_STATUS_TRANSITION`

Errors must not expose SQL details, stack traces, TypeORM errors, or internal class names.

## Module Structure

The module uses the standard NestJS layered style with small persistence ports. It does not introduce Clean Architecture layers or separate domain entities.

```text
src/modules/room-catalog/
|-- dto/
|-- entities/
|-- repositories/
|   |-- ports/
|   `-- typeorm/
|-- controllers/
|-- services/
`-- room-catalog.module.ts
```

Services and repository ports are:

- `RoomTypeService` -> `RoomTypeRepositoryPort` -> TypeORM adapter
- `FacilityService` -> `FacilityRepositoryPort` -> TypeORM adapter
- `RoomService` -> `RoomRepositoryPort` -> TypeORM adapter

The module uses five thin controllers:

- `PublicRoomTypeController`
- `StaffRoomController`
- `ManagementRoomTypeController`
- `ManagementFacilityController`
- `ManagementRoomController`

The room type service owns room type facility assignment coordination. There is no service or repository dedicated to the join table.

## Transactions and Concurrency

Use `DataSource.transaction()` for multi-write and check-then-write operations. Inside the callback, use only repositories created from the provided transaction manager.

Transactions are required for:

- Creating a room type with facilities.
- Adding or removing facilities in bulk.
- Checking related rooms and deactivating a room type.
- Checking active room type associations and deactivating a facility.
- Operations that lock a dependency before validating and writing.

Create room and room type deactivation operations lock the relevant room type row. Facility assignment and facility deactivation lock the relevant facility rows. Locks use a stable ordering when multiple rows are involved to reduce deadlock risk.

Single-entity updates that do not perform a dependent check do not need an explicit transaction.

## Swagger

Every route documents request DTOs, query DTOs, response DTOs, authentication, authorization-relevant errors, and the runtime `{ data, meta }` envelope.

Add a shared `ApiPaginatedSuccessResponse(ItemDto)` decorator because the current success decorator documents one object and cannot correctly describe an array-valued paginated response.

## Testing Strategy

- Service unit tests cover business rules, lifecycle checks, state transitions, idempotent operations, and error mappings.
- Controller unit tests cover delegation and response mapping where behavior is not already proven by E2E tests.
- Repository integration tests use PostgreSQL and cover mappings, case-insensitive uniqueness, foreign keys, queries, transactions, and row locking.
- E2E coverage is deferred by the current user-approved scope.
- Migration `up` and `down` are tested on PostgreSQL.
- Relevant format and lint checks pass.
- The repository-local Nest build passes when module wiring is added.

SQLite is not an accepted substitute because the feature depends on PostgreSQL enums, expression indexes, foreign keys, and row locking behavior.

## Milestones

### Milestone 1 - Planning and Tracking

- Create this plan and the feature task checklist.
- Record the active feature paths in `PROGRESS.md`.
- Align architecture documentation with the approved standard-module HTTP exception and migration rules.
- Stop for review.

### Milestone 2 - Persistence Foundation

- Add the migration, entities, repository ports, and TypeORM adapters.
- Add PostgreSQL repository integration tests.
- Verify migration `up` and `down`.
- For the approved checkpoint, the retained tests are repository adapter unit tests and a module wiring unit test. Broader service, controller, E2E, and coverage tests are deferred by the current user scope. PostgreSQL integration tests and migration `up` and `down` verification are also deferred.
- Stop for review.

### Milestone 3 - Facility Management

- Add facility DTOs, service rules, repository behavior, controller routes, and unit tests.
- Focused facility E2E tests are deferred by the current approved scope.
- Stop for review.

### Milestone 4 - Room Type Management and Public Queries

- Add room type DTOs, service rules, facility assignment operations, management routes, public routes, and unit tests. Focused E2E tests are deferred by the current user-approved scope.
- Stop for review.

### Milestone 5 - Room Management and Staff Queries

- Add room DTOs, lifecycle transitions, management routes, staff routes, and unit tests. Focused E2E tests are deferred by the current user-approved scope.
- Stop for review.

### Milestone 6 - API Contract and RBAC Completion

- Add the paginated Swagger decorator.
- Complete response documentation across all routes. RBAC E2E coverage is deferred by the current user-approved scope.
- Run relevant lint, format, test, and build checks.
- Stop for review.

### Milestone 7 - Feature Verification and Documentation Review

- Run the full room catalog test set.
- Recheck migration behavior and module wiring.
- Review README, architecture, plan, task tracking, and progress status for accuracy.
- Record exact verification evidence.
- Stop for final review.

## Definition of Done

The feature is complete only when:

- Every task in `TASK.md` is complete.
- All approved access rules and business invariants are implemented.
- Database constraints and transaction behavior are verified on PostgreSQL.
- Applicable unit and integration tests pass. E2E coverage is deferred by the current user-approved scope.
- Relevant lint and format checks pass.
- The repository-local Nest build passes.
- Swagger matches the runtime response contract.
- `PROGRESS.md` records the final status and verification evidence.
