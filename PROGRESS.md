# Project Progress

Last updated: 2026-08-20

## Active Feature

- Feature: `room-catalog`
- Status: Milestone 3 facility management is complete under the current approved scope. Focused Facility E2E coverage is deferred.
- Plan: `docs/features/room-catalog/PLAN.md`
- Task checklist: `docs/features/room-catalog/TASK.md`

## Current Checkpoint

- Facility request, query, update, and response DTOs are implemented.
- `POST /api/v1/room-catalog/management/facilities` is registered through `ManagementFacilityController` and requires Administrator or Hotel Manager roles.
- Facility creation trims through the DTO, stores an omitted description as `null`, starts active, checks names case-insensitively, and returns the response DTO from the service.
- Facility creation is covered by focused service tests for success and duplicate pre-check behavior.
- Management Facility list supports pagination, name search, and lifecycle filtering. The service returns `PaginatedResult` for the global response interceptor.
- Facility list is covered by focused service and TypeORM adapter tests.
- Management Facility detail returns active and inactive facilities, with `FACILITY_NOT_FOUND` for missing identifiers.
- Facility detail is covered by focused service and controller tests.
- Management Facility update handles missing facilities, duplicate names owned by another facility, explicit null descriptions, and display-casing-only name changes.
- Facility update is covered by focused service and controller tests.
- Facility deactivation locks the Facility row, rejects active room type assignments, and changes `isActive` to `false` without deleting the row.
- Facility deactivation is covered by focused TypeORM adapter, service, and controller tests.
- Facility restore returns `FACILITY_NOT_FOUND` for a missing ID, reactivates inactive Facilities, and is an idempotent no-op for an already active Facility.
- Facility restore is covered by focused service and controller tests.
- Management Facility Swagger documentation covers authentication, authorization, request DTOs, query DTOs, response envelopes, and expected business errors.
- `ApiPaginatedSuccessResponse` documents the runtime paginated response envelope and its required pagination metadata.
- Milestone 4 Room Type Management and Public Queries is the next feature checkpoint.
- PostgreSQL repository integration tests and migration `up` and `down` verification are deferred by the current approved scope.
- Milestone 2 review is approved under this scope.
- Milestone 3 Facility Management is approved under the current scope.

## Completed

- Milestone 1 planning and tracking is approved.
- The room-catalog migration contains only room-catalog schema changes.
- Repository tokens alias the registered TypeORM adapters with `useExisting`.
- The retained unit tests pass. Focused Prettier and ESLint checks pass for the retained test files.

## Known Issues

- Concurrent duplicate facility creates are protected by the PostgreSQL expression index, but the service does not translate that database race error to `DUPLICATE_FACILITY_NAME` under the current approved scope.
- Focused Facility E2E coverage is deferred by the current approved scope. Swagger coverage remains incomplete for future room type and room routes.
- PostgreSQL integration and migration rollback verification remain deferred by the current approved scope.
- PostgreSQL repository integration and migration rollback behavior remain unverified until the deferred scope is reopened.
- The global npm launcher is unreliable in this environment. Repository-local Node.js commands remain available.

## Next Steps

1. Start Milestone 4 Room Type Management and Public Queries.
2. Keep focused Facility E2E coverage deferred until the approved scope is reopened.
3. Complete Swagger coverage for the remaining Room Catalog routes in Milestone 6.

## Verification

- Facility creation review: 3 focused suites and 6 tests passed.
- Prettier and ESLint passed for the Facility creation service, controller, module, and focused tests.
- The repository-local Nest build passed after Facility module wiring.
- Facility list review: 3 focused suites and 7 tests passed. Prettier, ESLint, and the repository-local Nest build passed.
- Facility detail review: 4 focused suites and 13 tests passed. Prettier, ESLint, and the repository-local Nest build passed.
- Facility update review: 4 focused suites and 19 tests passed. Prettier, ESLint, and the repository-local Nest build passed.
- Facility deactivation review: 3 focused suites and 23 tests passed. Prettier, ESLint, and the repository-local Nest build passed.
- Facility restore review: 4 focused suites and 28 tests passed. Prettier, ESLint, and the repository-local Nest build passed.
- Management Facility Swagger review: 5 focused suites and 29 tests passed. Prettier, ESLint, and the repository-local Nest build passed.
