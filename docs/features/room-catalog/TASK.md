# Room Catalog Task Checklist

Active plan: `docs/features/room-catalog/PLAN.md`

## Milestone 1 - Planning and Tracking

- [x] Confirm the feature scope, authorization, data model, lifecycle, API, and testing decisions.
- [x] Create `docs/features/room-catalog/PLAN.md`.
- [x] Create `docs/features/room-catalog/TASK.md`.
- [x] Update `docs/architecture.md` for standard-module HTTP exceptions and centralized migration storage.
- [x] Record the active plan and task paths in `PROGRESS.md`.
- [x] Run the documentation format check.
- [x] Review and approve Milestone 1 before implementation starts.

## Milestone 2 - Persistence Foundation

- [x] Create the room catalog PostgreSQL migration in `src/database/migrations`.
- [x] Add the room type, facility, room type facility, and room TypeORM entities.
- [x] Add `RoomTypeRepositoryPort`, `FacilityRepositoryPort`, and `RoomRepositoryPort`.
- [x] Add TypeORM adapters for all three repository ports.
- [x] Wire repository tokens and adapters in `RoomCatalogModule`.
- [x] Add focused repository adapter unit tests.
- [x] Add a focused module wiring unit test.
- [x] Run focused format and lint checks.
- [x] Run the repository-local Nest build.
- [x] Review and approve Milestone 2 under the current scope.

## Milestone 3 - Facility Management

- [x] Add facility request, query, and response DTOs.
- [x] Implement facility create, list, detail, update, deactivate, and restore rules.
- [x] Implement case-insensitive duplicate handling with stable error codes under the approved pre-check scope.
- [x] Add `ManagementFacilityController` with Administrator and Hotel Manager RBAC.
- [x] Add facility service unit tests.
- [x] Defer focused facility E2E tests by the current approved scope.
- [x] Run focused verification commands.
- [x] Review and approve Milestone 3 under the current scope.

## Milestone 4 - Room Type Management and Public Queries

- [x] Add room type request, query, and response DTOs.
- [x] Implement room type create, list, detail, update, deactivate, and restore rules.
- [x] Implement atomic bulk facility add and remove operations.
- [x] Implement room type transactions and stable row locking.
- [x] Add `ManagementRoomTypeController` with Administrator and Hotel Manager RBAC.
- [x] Add `PublicRoomTypeController` with active-only public queries.
- [x] Add room type and facility-assignment service unit tests.
- [x] Defer focused public and management room type E2E tests by the current user-approved scope.
- [x] Run focused verification commands.
- [ ] Review and approve Milestone 4.

## Milestone 5 - Room Management and Staff Queries

- [ ] Add room request, query, status, and response DTOs.
- [ ] Implement room create, list, detail, metadata update, retire, and restore rules.
- [ ] Implement operational status transitions and same-state idempotency.
- [ ] Implement room type change restrictions and dependency locking.
- [ ] Add `ManagementRoomController` with Administrator and Hotel Manager RBAC.
- [ ] Add `StaffRoomController` with all five non-customer staff roles.
- [ ] Add room service unit tests.
- [x] Defer focused management, staff, lifecycle, and RBAC E2E tests by the current user-approved scope.
- [ ] Run focused verification commands.
- [ ] Review and approve Milestone 5.

## Milestone 6 - API Contract and RBAC Completion

- [x] Add and test `ApiPaginatedSuccessResponse`.
- [ ] Document all request, query, success, pagination, authentication, and error contracts in Swagger.
- [ ] Verify public routes do not require bearer authentication.
- [ ] Verify staff routes reject Customer accounts.
- [ ] Verify management routes reject non-management staff roles.
- [ ] Verify hidden inactive and retired resources return `404`.
- [ ] Run all in-scope room catalog unit and integration tests. E2E coverage is deferred by the current user-approved scope.
- [ ] Run relevant format and lint checks.
- [ ] Run the repository-local Nest build.
- [ ] Review and approve Milestone 6.

## Milestone 7 - Feature Verification and Documentation Review

- [ ] Re-run the full in-scope room catalog test set. E2E coverage is deferred by the current user-approved scope.
- [ ] Re-run migration `up` and `down` verification on PostgreSQL.
- [ ] Re-run relevant format and lint checks.
- [ ] Re-run the repository-local Nest build.
- [ ] Review API and Swagger output against the approved plan.
- [ ] Review module boundaries and confirm no pricing, inventory, reservation, stay, or customer dependency was added.
- [ ] Update `README.md` if implemented behavior needs user-facing documentation.
- [ ] Update `docs/architecture.md` if implementation changed an approved architectural convention.
- [ ] Record exact verification evidence in `PROGRESS.md`.
- [ ] Mark the feature complete only after every required task and verification step passes.

## Deferred Integration

- [ ] Add a minimal public room catalog query contract when `pricing` has a concrete consumer requirement.
- [ ] Add events when `inventory-availability`, housekeeping, maintenance, or reporting has a concrete consumer requirement.
- [ ] Add stay and inventory consistency checks when those modules exist.
- [ ] Design status history or audit storage only when reporting or compliance requirements are defined.
