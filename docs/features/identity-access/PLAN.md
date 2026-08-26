# Identity Access E2E Extension Plan

## Status

Milestone 1 is complete and approved on 2026-08-24.

## Goal

Add one focused PostgreSQL E2E suite for the existing Identity Access module without changing its production behavior.

## Scope

The E2E extension verifies the existing authentication API through `AppModule` with pending migrations and real PostgreSQL repositories.

It covers:

- Runtime request validation and response envelopes.
- Public access to sign-up, email verification, sign-in, refresh, forgot-password, reset-password, and logout.
- JWT authentication and Administrator-only RBAC for change-password.
- Normalized account persistence and Argon2id password hashing.
- Email verification activation and idempotent repeated verification.
- Refresh-token rotation and logout revocation.
- Enumeration-safe password recovery and one-time reset-token use.
- Password-change and password-reset refresh-token revocation.
- Persisted Account and Account Token state.

## Test Isolation and Safety

- Use only a dedicated PostgreSQL database whose name ends with `_test` or `-test`.
- Apply pending migrations through the application data source.
- Use real Identity Access repositories, transaction handling, hashing, token generation, JWT signing, guards, and HTTP presentation behavior.
- Replace only SMTP delivery with an in-process fake so the suite can capture verification and reset tokens without sending external email.
- Give every owned account a run-specific email prefix.
- Delete only accounts with that prefix and rely on the existing cascading Account Token foreign key for token cleanup.
- Run serially through the guarded E2E Jest configuration.

## Non-Goals

- Changing Identity Access production code or API behavior.
- Sending live SMTP email.
- Testing Google OAuth or future account-management APIs.
- Adding E2E behavior for another business module.
- Replacing existing unit tests or adding standalone repository integration tests.

## Milestone 1 - PostgreSQL E2E Scope Extension

- Add `test/identity-access.e2e-spec.ts` through `AppModule`.
- Exercise all eight existing authentication routes.
- Verify validation, authentication, RBAC, response envelopes, lifecycle behavior, and persisted state.
- Run the focused suite on a disposable dedicated test database and confirm database removal.
- Run focused ESLint and Prettier checks plus the repository-local Nest build.
- Record exact evidence in `TASK.md` and `PROGRESS.md`.
- Stop for user review before approval.
- Record explicit user approval.
