# Pricing Task Checklist

Active plan: `docs/features/pricing/PLAN.md`

Status: Milestones 2 and 3 are implemented and awaiting review.

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
- [x] Add the Room Rate TypeORM entity without importing a Room Catalog entity.
- [x] Add the Room Rate repository port and TypeORM adapter.
- [x] Keep database overlap violations outside the application error mapping.
- [x] Add an injectable hotel-local clock for `Asia/Ho_Chi_Minh` business dates.
- [x] Add the initial `PricingModule` wiring.
- [x] Add required service unit coverage for the Room Catalog contract and persistence-facing rules.
- [x] Run focused verification.
- [ ] Review and approve Milestone 2.

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
- [ ] Review and approve Milestone 3.

### Verification Evidence

- On 2026-08-23, 3 focused controller and service suites passed with 51 tests after the DTO, service, and repository responsibility review.
- Focused ESLint and Prettier checks passed for the changed TypeScript and tracking files.
- The repository-local Nest build and `git diff --check` passed.
- DTOs use built-in `class-validator` decorators for field rules, the service owns remaining business checks, and the repository only performs data operations and queries.
- The Pricing migration and PostgreSQL exclusion constraint have not been executed against PostgreSQL.

## Milestone 4 - Internal Bulk Quote Contract

- [ ] Add module-owned quote request and result types.
- [ ] Implement one bulk rate read for all requested Room Type IDs and nights.
- [ ] Sum adjacent ranges into `pricePerRoomStay` with safe integer checks.
- [ ] Return every applied Room Rate with stored and stay-clipped boundaries.
- [ ] Calculate each applied rate's night count and subtotal.
- [ ] Return incomplete-coverage Room Types through `unquotedRoomTypeIds` without partial totals.
- [ ] Preserve input Room Type order in quote results.
- [ ] Export the intentional Pricing quote contract from `PricingModule`.
- [ ] Add Pricing quote service unit tests.
- [ ] Test a stay that starts in the first of three rates and ends in the third returns all three applied rates.
- [ ] Verify no public Pricing HTTP route was added.
- [ ] Verify Pricing has no Booking dependency.
- [ ] Run focused verification.
- [ ] Review and approve Milestone 4.

## Milestone 5 - Feature Verification and Documentation Review

- [ ] Run all Pricing controller and service unit tests.
- [ ] Run focused tests for the Room Catalog public contract added for Pricing.
- [ ] Run relevant ESLint checks.
- [ ] Run relevant Prettier checks.
- [ ] Run the repository-local Nest build.
- [ ] Run `git diff --check`.
- [ ] Review Swagger metadata against the implemented Pricing API.
- [ ] Review module imports and exports against the approved dependency direction.
- [ ] Record PostgreSQL migration and exclusion-constraint execution as verified or explicitly unverified.
- [ ] Review `README.md` and architecture documentation for implementation accuracy.
- [ ] Record exact verification evidence in `PROGRESS.md`.
- [ ] Mark Pricing complete under the approved scope.
- [ ] Review and approve Milestone 5.

## Deferred Booking Decisions

The following items are intentionally outside Pricing and remain for a separate Booking plan:

- Mixed Room Type availability combination bounds and pagination semantics.
- Post-booking operational-capacity loss and room-assignment conflict handling.
- Reservation creation, edit, payment, expiration, and check-in transaction strategies.
- Customer, Payment, and Housekeeping module sequencing.
