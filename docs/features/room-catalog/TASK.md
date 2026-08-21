# Room Catalog Task Checklist

Active plan: `docs/features/room-catalog/PLAN.md`

Status: Complete under the controller and service unit-test scope approved on 2026-08-21.

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
- [x] Review and approve Milestone 4 under the current E2E-deferred scope.

## Milestone 5 - Room Management and Staff Queries

- [x] Add room request, query, status, and response DTOs.
- [x] Implement room create, list, detail, metadata update, retire, and restore rules.
- [x] Implement operational status transitions and same-state idempotency.
- [x] Implement room type change restrictions and dependency locking.
- [x] Add `ManagementRoomController` with Administrator and Hotel Manager RBAC.
- [x] Add `StaffRoomController` with all five non-customer staff roles.
- [x] Add room service unit tests.
- [x] Defer focused management, staff, lifecycle, and RBAC E2E tests by the current user-approved scope.
- [x] Run focused verification commands.
- [x] Review and approve Milestone 5 under the current E2E-deferred scope.

## Milestone 6 - API Contract and RBAC Completion

- [x] Add and test `ApiPaginatedSuccessResponse`.
- [x] Document all request, query, success, pagination, authentication, and error contracts in Swagger.
- [x] Verify public routes do not require bearer authentication.
- [x] Verify staff routes reject Customer accounts.
- [x] Verify management routes reject non-management staff roles.
- [x] Verify hidden inactive and retired resources return `404`.
- [x] Run all in-scope Room Catalog controller and service unit tests.
- [x] Run relevant format and lint checks.
- [x] Run the repository-local Nest build.
- [x] Review and approve Milestone 6 under the controller and service unit-test scope.

## Milestone 7 - Feature Verification and Documentation Review

- [x] Re-run the full Room Catalog controller and service unit-test set.
- [x] Record repository integration, E2E, and PostgreSQL migration verification as outside the required completion scope.
- [x] Re-run relevant format and lint checks.
- [x] Re-run the repository-local Nest build.
- [x] Review API and Swagger metadata against the approved plan.
- [x] Review module boundaries and confirm no pricing, inventory, reservation, stay, or customer dependency was added.
- [x] Review `README.md`; no implemented behavior requires an update.
- [x] Review `docs/architecture.md`; no approved architectural convention changed.
- [x] Record exact verification evidence in `PROGRESS.md`.
- [x] Mark the feature complete after every required task and verification step passes.

## Future Work Outside the Completed Scope

- Add a minimal public room catalog query contract when `pricing` has a concrete consumer requirement.
- Add events when `inventory-availability`, housekeeping, maintenance, or reporting has a concrete consumer requirement.
- Add stay and inventory consistency checks when those modules exist.
- Design status history or audit storage only when reporting or compliance requirements are defined.
