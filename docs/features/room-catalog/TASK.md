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

- [ ] Create the room catalog PostgreSQL migration in `src/database/migrations`.
- [ ] Add the room type, facility, room type facility, and room TypeORM entities.
- [ ] Add `RoomTypeRepositoryPort`, `FacilityRepositoryPort`, and `RoomRepositoryPort`.
- [ ] Add TypeORM adapters for all three repository ports.
- [ ] Wire repository tokens and adapters in `RoomCatalogModule`.
- [ ] Add PostgreSQL repository integration tests.
- [ ] Verify migration `up` and `down` on PostgreSQL.
- [ ] Run focused format and lint checks.
- [ ] Run the repository-local Nest build.
- [ ] Review and approve Milestone 2.

## Milestone 3 - Facility Management

- [ ] Add facility request, query, and response DTOs.
- [ ] Implement facility create, list, detail, update, deactivate, and restore rules.
- [ ] Implement case-insensitive duplicate handling with stable error codes.
- [ ] Add `ManagementFacilityController` with Administrator and Hotel Manager RBAC.
- [ ] Add facility service unit tests.
- [ ] Add focused facility E2E tests.
- [ ] Run focused verification commands.
- [ ] Review and approve Milestone 3.

## Milestone 4 - Room Type Management and Public Queries

- [ ] Add room type request, query, and response DTOs.
- [ ] Implement room type create, list, detail, update, deactivate, and restore rules.
- [ ] Implement atomic bulk facility add and remove operations.
- [ ] Implement room type transactions and stable row locking.
- [ ] Add `ManagementRoomTypeController` with Administrator and Hotel Manager RBAC.
- [ ] Add `PublicRoomTypeController` with active-only public queries.
- [ ] Add room type and facility-assignment service unit tests.
- [ ] Add focused public and management room type E2E tests.
- [ ] Run focused verification commands.
- [ ] Review and approve Milestone 4.

## Milestone 5 - Room Management and Staff Queries

- [ ] Add room request, query, status, and response DTOs.
- [ ] Implement room create, list, detail, metadata update, retire, and restore rules.
- [ ] Implement operational status transitions and same-state idempotency.
- [ ] Implement room type change restrictions and dependency locking.
- [ ] Add `ManagementRoomController` with Administrator and Hotel Manager RBAC.
- [ ] Add `StaffRoomController` with all five non-customer staff roles.
- [ ] Add room service unit tests.
- [ ] Add focused management, staff, lifecycle, and RBAC E2E tests.
- [ ] Run focused verification commands.
- [ ] Review and approve Milestone 5.

## Milestone 6 - API Contract and RBAC Completion

- [ ] Add and test `ApiPaginatedSuccessResponse`.
- [ ] Document all request, query, success, pagination, authentication, and error contracts in Swagger.
- [ ] Verify public routes do not require bearer authentication.
- [ ] Verify staff routes reject Customer accounts.
- [ ] Verify management routes reject non-management staff roles.
- [ ] Verify hidden inactive and retired resources return `404`.
- [ ] Run all room catalog unit, integration, and E2E tests.
- [ ] Run relevant format and lint checks.
- [ ] Run the repository-local Nest build.
- [ ] Review and approve Milestone 6.

## Milestone 7 - Feature Verification and Documentation Review

- [ ] Re-run the full room catalog test set.
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
