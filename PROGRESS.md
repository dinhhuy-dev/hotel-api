# Project Progress

Last updated: 2026-08-20

## Active Feature

- Feature: `room-catalog`
- Status: Milestone 3 Facility Management is complete under the approved scope. Milestone 4 Room Type Management and Public Queries is in progress.
- Plan: `docs/features/room-catalog/PLAN.md`
- Task checklist: `docs/features/room-catalog/TASK.md`

## Current Checkpoint

- Room Type create, management list, detail, update, deactivation, and restore are implemented.
- `ManagementRoomTypeController` provides create, management list/detail, update, deactivation, restoration, bulk Facility add, and bulk Facility remove routes for Administrator and Hotel Manager roles.
- Creation normalizes and validates the immutable code, accepts optional unique Facility IDs, locks Facilities in stable ID order, and creates Room Type Facility assignments atomically.
- Invalid Facility IDs are returned together as `INVALID_FACILITIES`; the current error envelope exposes them as message entries.
- Management list supports pagination, code or name search, active-state filtering, and complete Facility mapping. Management detail and update return active or inactive Room Types and use `ROOM_TYPE_NOT_FOUND` when absent.
- Deactivation locks the Room Type, rejects any related non-retired Room with `ROOM_TYPE_IN_USE`, and sets `isActive` to `false` without deleting the record.
- Restore locks the Room Type and assigned Facilities, rejects inactive assigned Facilities with `INACTIVE_FACILITY`, restores only the Room Type, and is an idempotent no-op when it is already active.
- Bulk Facility add and remove operations are atomic. They lock the Room Type and submitted existing Facilities in stable ID order. Add rejects all changes when any submitted Facility is missing or inactive with `INVALID_FACILITIES`; duplicate assignments are no-ops. Remove permits missing, inactive, or unassigned Facility IDs as no-ops.
- Services map response DTOs and controllers only delegate.
- `PublicRoomTypeController` provides unauthenticated active-only Room Type list and detail routes.
- Public lists support pagination and code or name search, sort by display order then name, and return no lifecycle fields or timestamps.
- Public detail hides inactive or missing Room Types as `404` and returns active assigned Facilities only, without lifecycle fields or timestamps.
- Swagger documents all public and management Room Type routes, including request and query schemas, response envelopes, authentication, authorization-relevant errors, and business errors.
- Focused Room Type E2E coverage is deferred by the current user-approved scope.

## Completed

- Milestones 1 through 3 are approved under the existing scope, including the focused Facility test coverage and Swagger checkpoint.
- The Room Catalog migration, entities, persistence ports, TypeORM adapters, and module aliases are in place.
- Milestone 4 Room Type request, query, and response DTOs are implemented.

## Known Issues

- The Room Catalog plan status heading still says Milestone 3 is next and its error-code list does not yet describe `INVALID_FACILITIES`; align the plan before the Milestone 4 review.
- The working tree is intentionally uncommitted and includes the Facility controller rename from `facility.controller.ts` to `management-facility.controller.ts` plus partial Room Type work.
- Repository adapter tests are outside the current approved Room Type test scope. Do not add or run them for future Room Type checkpoints.
- Focused Facility and Room Type E2E coverage, PostgreSQL repository integration, and migration rollback verification remain deferred by the approved scope.
- The global npm launcher is unreliable in this environment. Use repository-local Node.js commands.

## Next Steps

1. Review the Room Type public query and Swagger checkpoint.
2. Align the Room Catalog plan status and error-code list before the Milestone 4 review.
3. Review and approve Milestone 4 under the current E2E-deferred scope.

## Verification

- `node node_modules/jest/bin/jest.js modules/room-catalog/services/room-type.service.spec.ts modules/room-catalog/controller/management-room-type.controller.spec.ts --runInBand` passed: 2 suites, 21 tests.
- Focused Room Type update, deactivation, and restore ESLint and Prettier checks passed. `node node_modules/@nestjs/cli/bin/nest.js build` passed.
- `node node_modules/jest/bin/jest.js modules/room-catalog/repositories/typeorm/typeorm-repositories.spec.ts modules/room-catalog/services/room-type.service.spec.ts modules/room-catalog/controller/management-room-type.controller.spec.ts modules/room-catalog/room-catalog.module.spec.ts modules/room-catalog/services/facility.service.spec.ts modules/room-catalog/controller/management-facility.controller.spec.ts --runInBand` passed: 6 suites, 41 tests.
- Focused Prettier and ESLint checks passed for the changed Room Type implementation, tests, module wiring, and DTOs.
- `node node_modules/@nestjs/cli/bin/nest.js build` and `git diff --check` passed.
- `node node_modules/jest/bin/jest.js modules/room-catalog/services/room-type.service.spec.ts modules/room-catalog/controller/management-room-type.controller.spec.ts --runInBand` passed: 2 suites, 28 tests.
- Focused ESLint and Prettier checks passed for bulk Facility assignment source and tests. `node node_modules/@nestjs/cli/bin/nest.js build` and `git diff --check` passed.
- `node node_modules/jest/bin/jest.js modules/room-catalog/services/room-type.service.spec.ts modules/room-catalog/controller/public-room-type.controller.spec.ts modules/room-catalog/room-catalog.module.spec.ts --runInBand` passed: 3 suites, 26 tests.
- Focused ESLint and Prettier checks passed for the public Room Type source, DTOs, service and controller tests, repository port and adapter, and module wiring. `node node_modules/@nestjs/cli/bin/nest.js build` and `git diff --check` passed.
- `node node_modules/jest/bin/jest.js modules/room-catalog/controller/management-room-type.controller.spec.ts modules/room-catalog/controller/public-room-type.controller.spec.ts common/decorators/api-success-response.decorator.spec.ts --runInBand` passed: 3 suites, 15 tests.
- Focused ESLint and Prettier checks passed for Room Type Swagger controllers, DTO schemas, and metadata tests. `node node_modules/@nestjs/cli/bin/nest.js build` and `git diff --check` passed.
