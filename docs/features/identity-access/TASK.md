# Identity Access E2E Extension Tasks

## Milestone 1 - PostgreSQL E2E Scope Extension

- [x] Record the explicit Identity Access PostgreSQL E2E scope expansion.
- [x] Add `test/identity-access.e2e-spec.ts` through `AppModule` with pending migrations and real repositories.
- [x] Replace SMTP delivery with an in-process token-capturing fake.
- [x] Cover runtime validation, public-route access, JWT authentication, Administrator RBAC, and response envelopes.
- [x] Exercise sign-up, email verification, sign-in, refresh, forgot-password, reset-password, change-password, and logout.
- [x] Verify normalized account persistence, real password hashing, token hashing, Account lifecycle state, and Account Token state.
- [x] Verify repeated email verification, refresh rotation, idempotent logout, enumeration-safe recovery, and one-time reset tokens.
- [x] Verify password reset and password change revoke the stored refresh token.
- [x] Keep cleanup limited to run-specific Account and cascading Account Token rows.
- [x] Run the focused E2E suite on a disposable dedicated test database and confirm database removal.
- [x] Run focused ESLint and Prettier checks.
- [x] Run the repository-local Nest build.
- [x] Run staged and unstaged `git diff --check` plus a focused no-em-dash scan.
- [x] Record exact verification evidence in `PROGRESS.md`.
- [x] Review and approve Milestone 1.

### Verification Evidence

- The user approved Identity Access Milestone 1 on 2026-08-24.
- On 2026-08-24, the focused Identity Access PostgreSQL E2E suite passed with 1 suite and 5 tests on the disposable `hotel_api_identity_access_01a033df_test` database.
- The suite exercised all eight authentication routes through `AppModule` with pending migrations, real PostgreSQL repositories, real transactions, Argon2id hashing, opaque-token generation and hashing, JWT signing, global guards, runtime validation, and response envelopes.
- SMTP delivery alone was replaced with an in-process fake. The captured verification and reset tokens drove the real application handlers and persisted token records.
- The tests verified sign-up persistence and normalization, pending-account rejection, email activation and repeated verification, sign-in, refresh rotation, logout, enumeration-safe recovery, one-time password reset, Administrator-only password change, Customer rejection, refresh revocation, and persisted Account and Account Token state.
- Suite-owned rows were cleaned, the disposable database was removed, and a final PostgreSQL query confirmed that no database with that exact name remained.
- Focused E2E ESLint and Prettier, the repository-local Nest build, staged and unstaged `git diff --check`, untracked-file whitespace checks, and the focused no-em-dash scan passed.
