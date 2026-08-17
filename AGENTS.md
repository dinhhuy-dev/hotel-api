# Agent Instructions

## Language

- Write all code, comments, tests, and documentation in plain English.
- Never use the em dash character. Use a plain hyphen instead.

## Project Context Documents

Before starting any task, read these documents in order:

1. `README.md` for the project overview and product scope.
2. `docs/architecture.md` for architecture and technical conventions.
3. `PROGRESS.md` for the latest status, unfinished work, known issues, and next steps.
4. For feature work, read the active feature's `PLAN.md` and `TASK.md` paths recorded in `PROGRESS.md`.

- Verify code and tests before claiming that a planned feature is implemented.
- Preserve the single-hotel scope. Do not add branches, multi-hotel behavior, or tenancy fields.

## Architecture

- Organize the application as a NestJS modular monolith by business capability.
- Use Clean Architecture only in the `identity-access` module.
- Keep the `identity-access` domain and application layers independent from NestJS, HTTP, TypeORM, and external providers.
- Use standard NestJS modules, controllers, services, repositories, DTOs, and entities for other business modules.
- Use account roles for RBAC. Do not add dynamic permission management.

## Package Manager

- Use npm and keep `package-lock.json` synchronized with `package.json`.
- Prefer repository-local tool commands. A broken global npm launcher is an environment error, not a project build failure.

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

## Progress Updates

- Mark an item complete in the active feature's `TASK.md` as soon as it is finished. Do not wait until the end of the session.
- At the end of every session, update the root `PROGRESS.md` before sending the final response.
- Add the newest dated entry at the top with `Completed`, `In Progress`, `Known Issues`, and `Next Steps` sections.
- Record the exact paths of the active feature's `PLAN.md` and `TASK.md` in `PROGRESS.md`.
