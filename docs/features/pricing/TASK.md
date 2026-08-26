# Pricing Task Checklist

Active plan: `docs/features/pricing/PLAN.md`

Status: Milestones 1 through 6 are complete and approved.

## Milestone 1 - Planning and Tracking

- [x] Confirm single-hotel Pricing ownership and MVP exclusions.
- [x] Confirm VND integer amounts and half-open Room Rate ranges.
- [x] Define PostgreSQL non-overlap enforcement per Room Type.
- [x] Define future-only create, update, and hard-delete rules.
- [x] Define Administrator and Hotel Manager authorization.
- [x] Define management routes, pagination, filters, response contracts, and errors.
- [x] Define all-range overlap results for management date filtering.
- [x] Define the minimal Room Catalog public contract required by Pricing.
- [x] Define the bulk internal quote request and result contracts.
- [x] Define all applied Room Rate segments in complete bulk quote results.
- [x] Keep Availability, Reservation, Payment, and Booking behavior outside Pricing.
- [x] Update `docs/architecture.md` for separate Pricing and consolidated Booking contexts.
- [x] Create `docs/features/pricing/PLAN.md`.
- [x] Create `docs/features/pricing/TASK.md`.
- [x] Record the active Pricing paths in `PROGRESS.md`.
- [x] Run focused documentation verification.
- [x] Review and approve Milestone 1 before implementation starts.

## Milestone 2 - Persistence and Room Catalog Contract

- [x] Add the Room Catalog public query contract for single Room Type validation.
- [x] Export the intentional Room Catalog contract without exposing entities or repositories.
- [x] Add the Room Rate migration with checks, restrictive foreign key, and exclusion constraint.
- [x] Add the `btree_gist` extension step required by the exclusion constraint.
- [x] Add the Room Rate TypeORM entity with the approved Room Type persistence relationship.
- [x] Add the Room Rate repository port and TypeORM adapter.
- [x] Keep database overlap violations outside the application error mapping.
- [x] Add an injectable hotel-local clock for `Asia/Ho_Chi_Minh` business dates.
- [x] Add the initial `PricingModule` wiring.
- [x] Add required service unit coverage for the Room Catalog contract and persistence-facing rules.
- [x] Run focused verification.
- [x] Review and approve Milestone 2.

## Milestone 3 - Room Rate Management

- [x] Add Room Rate create, update, query, and response DTOs.
- [x] Implement active Room Type validation for create and update.
- [x] Implement future-only create, update, and hard-delete rules.
- [x] Implement list and detail reads for past, current, and future rates.
- [x] Return every complete stored Room Rate that overlaps `[fromDate, toDate)`.
- [x] Apply pagination totals after the management overlap filter.
- [x] Implement overlap pre-checks without redundant application transactions or row locks.
- [x] Add `ManagementRoomRateController` with Administrator and Hotel Manager RBAC.
- [x] Document management endpoints and response envelopes in Swagger.
- [x] Add Room Rate service unit tests.
- [x] Add management controller unit tests.
- [x] Run focused verification.
- [x] Review and approve Milestone 3.

### Verification Evidence

- On 2026-08-23, 3 focused controller and service suites passed with 51 tests after the DTO, service, and repository responsibility review.
- Focused ESLint and Prettier checks passed for the changed TypeScript and tracking files.
- The repository-local Nest build and `git diff --check` passed.
- DTOs use built-in `class-validator` decorators for field rules, the service owns remaining business checks, and the repository only performs data operations and queries.
- The user later confirmed that the Pricing migration had already completed without errors against PostgreSQL. The agent did not independently observe that execution.

## Milestone 4 - Internal Bulk Quote Contract

- [x] Add module-owned quote request and result types.
- [x] Implement one bulk rate read for all requested Room Type IDs and nights.
- [x] Sum adjacent ranges into `pricePerRoomStay` with safe integer checks.
- [x] Return every applied Room Rate with stored and stay-clipped boundaries.
- [x] Calculate each applied rate's night count and subtotal.
- [x] Return incomplete-coverage Room Types through `unquotedRoomTypeIds` without partial totals.
- [x] Preserve input Room Type order in quote results.
- [x] Export the intentional Pricing quote contract from `PricingModule`.
- [x] Add Pricing quote service unit tests.
- [x] Test a stay that starts in the first of three rates and ends in the third returns all three applied rates.
- [x] Verify no public Pricing HTTP route was added.
- [x] Verify Pricing has no Booking dependency.
- [x] Run focused verification.
- [x] Review and approve Milestone 4.

### Verification Evidence

- On 2026-08-23, 4 focused Pricing and Room Catalog controller/service suites passed with 64 tests.
- Focused ESLint and Prettier checks passed for the Milestone 4 TypeScript and tracking files.
- The repository-local Nest build and `git diff --check` passed.
- The quote request DTO owns field-level validation, the quote service owns cross-field and coverage rules, and the repository performs one bulk overlap query.
- A source boundary scan found only the management Pricing controller and no Booking dependency under `src/modules/pricing`.
- The user later confirmed that the Pricing migration had already completed without errors against PostgreSQL. The agent did not independently observe that execution.

## Milestone 5 - Feature Verification and Documentation Review

- [x] Run all Pricing controller and service unit tests.
- [x] Run focused tests for the Room Catalog public contract added for Pricing.
- [x] Run relevant ESLint checks.
- [x] Run relevant Prettier checks.
- [x] Run the repository-local Nest build.
- [x] Run `git diff --check`.
- [x] Review Swagger metadata against the implemented Pricing API.
- [x] Review module imports and exports against the approved dependency direction.
- [x] Record PostgreSQL migration and exclusion-constraint execution as verified or explicitly unverified.
- [x] Review `README.md` and architecture documentation for implementation accuracy.
- [x] Record exact verification evidence in `PROGRESS.md`.
- [x] Mark Pricing complete under the approved scope.
- [x] Review and approve Milestone 5.

### Verification Evidence

- On 2026-08-23, all 3 Pricing controller/service suites passed with 40 tests.
- The focused Room Catalog public-contract service suite passed with 24 tests.
- Relevant ESLint and Prettier checks passed for Pricing, the Room Catalog contract and service, the Pricing migration, and tracking documents.
- The repository-local Nest build and `git diff --check` passed.
- Swagger review confirmed five management Room Rate operations with bearer authentication, Administrator and Hotel Manager RBAC, request and response DTOs, paginated and object response envelopes, and operation-specific errors. No public Pricing HTTP controller exists.
- Module review confirmed Pricing exports only `PRICING_QUOTE_SERVICE`, its services depend on Room Catalog through the public contract, and it has no Booking dependency. The `RoomRate` entity has the approved Room Type persistence relationship backed by the restrictive foreign key in the migration.
- The user confirmed that the Pricing migration completed without errors against PostgreSQL before the Milestone 5 correction. The agent did not independently observe that execution. The added idempotent `CREATE EXTENSION IF NOT EXISTS btree_gist` statement protects fresh databases and was not part of the already-applied migration run.
- `README.md` and `docs/architecture.md` were reviewed. The README Pricing scope and Pricing plan structure/error list were updated for implementation accuracy.

## Milestone 6 - PostgreSQL E2E Scope Extension

- [x] Record the explicit Pricing PostgreSQL E2E scope expansion.
- [x] Add `test/pricing.e2e-spec.ts` through `AppModule` with pending migrations and real repositories.
- [x] Cover JWT authentication, Administrator and Hotel Manager RBAC, runtime validation, and response envelopes.
- [x] Exercise all five management Room Rate routes.
- [x] Verify active, inactive, and missing Room Type behavior plus overlap and future-only lifecycle rules.
- [x] Verify multi-range overlap filtering returns all complete stored ranges with sorting and pagination.
- [x] Exercise the internal bulk quote contract with three applied ranges and an unquoted Room Type.
- [x] Verify persisted create, update, and delete state through the real Room Rate repository.
- [x] Verify the migrated PostgreSQL exclusion constraint rejects overlapping stored rates.
- [x] Keep fixture cleanup limited to run-specific Room Types and Room Rates.
- [x] Run the focused E2E suite on a dedicated test database and confirm database removal.
- [x] Run focused ESLint and Prettier checks.
- [x] Run the repository-local Nest build.
- [x] Run staged and unstaged `git diff --check` plus a focused no-em-dash scan.
- [x] Record exact verification evidence in `PROGRESS.md`.
- [x] Review and approve Milestone 6.

### Verification Evidence

- The user approved Pricing Milestone 6 on 2026-08-24.
- On 2026-08-24, the focused Pricing PostgreSQL E2E suite passed with 1 suite and 5 tests on the disposable `hotel_api_pricing_01a033d6_test` database.
- The suite exercised all five Pricing management routes through `AppModule` with pending migrations, real repositories, JWT authentication and RBAC, runtime validation and response envelopes, active Room Type validation, overlap handling, multi-range filtering, pagination, future-only update and delete rules, stable error codes, and persisted state checks.
- The internal bulk quote contract returned all three applied Room Rates and the unquoted Room Type through a real bulk repository query. A direct overlapping write was rejected by the migrated `ex_room_rates_no_overlap` PostgreSQL constraint.
- Suite-owned fixture rows were cleaned, the disposable database was removed, and a final PostgreSQL query confirmed that no database with that exact name remained.
- Focused E2E ESLint and Prettier, the repository-local Nest build, staged and unstaged `git diff --check`, and the focused no-em-dash scan passed.

## Deferred Booking Decisions

The following items are intentionally outside Pricing and remain for a separate Booking plan:

- Mixed Room Type availability combination bounds and pagination semantics.
- Post-booking operational-capacity loss and room-assignment conflict handling.
- Reservation creation, edit, payment, expiration, and check-in transaction strategies.
- Customer, Payment, and Housekeeping module sequencing.
