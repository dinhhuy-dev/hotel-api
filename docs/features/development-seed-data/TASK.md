# Development Seed Data Task Checklist

Active plan: `docs/features/development-seed-data/PLAN.md`

Status: Complete and approved on 2026-08-23.

## Milestone 1 - Planning and Tracking

- [x] Inspect the current identity and room catalog persistence models.
- [x] Confirm the minimal identity account set for all current RBAC roles.
- [x] Confirm the minimal room catalog dataset and relationships.
- [x] Keep Identity Access and Room Catalog in separate executable seed files.
- [x] Include inactive facilities and a retired room in the Room Catalog dataset.
- [x] Define the development-only guard and seed password handling.
- [x] Define repeatable, non-destructive behavior for existing data.
- [x] Create `docs/features/development-seed-data/PLAN.md`.
- [x] Create `docs/features/development-seed-data/TASK.md`.
- [x] Record the active plan and task paths in `PROGRESS.md`.
- [x] Run the documentation format check.
- [x] Review and approve Milestone 1 before implementation starts.

## Milestone 2 - Seeder Implementation and Verification

- [x] Add `src/database/seeds/identity-access.seed.ts` with production protection and local validation.
- [x] Add `src/database/seeds/room-catalog.seed.ts` with production protection and local validation.
- [x] Create the six active, verified identity accounts through the existing domain and persistence mapping.
- [x] Create five facilities, including the two planned inactive facilities.
- [x] Create the three planned active room types and their active facility assignments.
- [x] Create the six planned rooms, including the retired room.
- [x] Make repeated runs skip compatible rows and reject conflicting natural keys.
- [x] Add repository-local scripts for each module and a combined `seed` command.
- [x] Add `SEED_ACCOUNT_PASSWORD` to `.env.example`.
- [x] Document migration and seed usage in `README.md`.
- [x] Run focused Prettier and ESLint checks.
- [x] Run the repository-local Nest build.
- [x] Run `git diff --check`.
- [x] Run the seed data against PostgreSQL, confirmed by the user on 2026-08-23.
- [x] Confirm the live seed result and accept the planned data, confirmed by the user on 2026-08-23.
- [x] Record exact verification evidence in `PROGRESS.md`.
- [x] Review and approve Milestone 2.

The agent did not independently observe the live seed command output or query the resulting row counts. Completion records the user's confirmation and approval.
