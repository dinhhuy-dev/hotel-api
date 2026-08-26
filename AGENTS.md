# Agent Instructions

## Language

- Write all code, comments, tests, and documentation in plain English.
- Never use the em dash character. Use a plain hyphen instead.

## Project Overview

- Hotel API is a backend for managing one hotel. It uses NestJS 11, TypeScript, PostgreSQL, and TypeORM.
- The application is a modular monolith. `identity-access` uses Clean Architecture; other business modules use the standard NestJS layered structure.
- Preserve the single-hotel scope. Do not add branches, multi-hotel behavior, or tenancy fields.

## Environment

- The primary development environment is Windows with PowerShell.
- Use npm and keep `package-lock.json` synchronized with `package.json`.
- Prefer the repository-local Node.js tool commands listed below. A broken global npm launcher is an environment error, not a project build failure.
- Use PostgreSQL, not SQLite, for migrations and database-specific integration behavior.

## Project Structure

- `src/modules/` contains business modules.
- `src/common/` contains shared HTTP and cross-cutting code.
- `src/configs/` contains application configuration.
- `src/database/` contains the TypeORM data source and centralized migrations.
- `test/` contains E2E tests; unit tests stay beside source files.
- `docs/` contains architecture, conventions, feature plans, and task checklists.

## Project Context Documents

- Read only the documents relevant to the current task:
  - `README.md` for product scope, user roles, setup, or commands.
  - `docs/architecture.md` for architecture, module boundaries, persistence, API, or cross-cutting changes.
  - `PROGRESS.md` for current status, unfinished work, known issues, or next steps.
  - For active feature planning, implementation, or review, read `PROGRESS.md`, then the active `PLAN.md` and `TASK.md` paths it records.
- When multiple conditions apply, read the applicable files in the order listed above.
- Skip unrelated project documents for simple, self-contained tasks.
- Verify code and tests before claiming that a planned feature is implemented.

## Commands

| Task           | Command                                                                      |
| -------------- | ---------------------------------------------------------------------------- |
| Build          | `node node_modules/@nestjs/cli/bin/nest.js build`                            |
| Unit test file | `node node_modules/jest/bin/jest.js path/to/file.spec.ts --runInBand`        |
| E2E tests      | `node node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand` |
| Lint file      | `node node_modules/eslint/bin/eslint.js path/to/file.ts`                     |
| Format check   | `node node_modules/prettier/bin/prettier.cjs --check path/to/file`           |

- Unit test paths passed to Jest are relative to `src`.
- Keep unit tests beside source files as `*.spec.ts`; keep E2E tests under `test/`.
- Run the narrowest relevant checks, then run the build when changes affect module wiring or compilation.

## Working Rules

- Treat guidance, explanation, diagnosis, and review requests as read-only except for required progress tracking.
- Split multi-file work into small, reviewable milestones and pause after each coherent milestone.
- Preserve unrelated working-tree changes.
- When a port or interface changes, update every adapter implementation in the same milestone.

## Agent-Led Implementation Workflow

- The agent implements feature source code and tests directly. The user reviews each completed checkpoint.
- For feature work, state a concise file-level plan, implement the affected production and test files, then run the narrowest relevant verification.
- Complete one coherent, reviewable checkpoint at a time and pause for user review before starting the next checkpoint.
- Guidance, explanation, diagnosis, and review requests remain read-only unless the user also requests a code change.
- The agent may edit feature source and tests within the active approved checkpoint. Preserve unrelated working-tree changes.
- Record focused verification evidence and update required progress tracking before handing a checkpoint to the user for review.

## Progress Tracking

- Mark an item complete in the active feature's `TASK.md` as soon as it is finished.
- Keep root `PROGRESS.md` as the current project snapshot. Refresh it after material state changes by replacing outdated information; do not update it for read-only work unless the recorded state needs correction.
- Record the active checkpoint, current issues, next steps, latest verification evidence, and exact active `PLAN.md` and `TASK.md` paths. Use Git history instead of recording routine session activity.
