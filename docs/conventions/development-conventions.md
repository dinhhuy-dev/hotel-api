# Development Conventions

## 1. Language and Tooling

- All code, comments, API descriptions, migrations, tests, and documentation are written in plain English.
- TypeScript code must satisfy ESLint and Prettier before review.
- New code must not introduce implicit `any`. Explicit `any` requires a documented adapter-boundary reason and immediate narrowing.
- Prefer `async` and `await` over promise chains for application workflows.
- A lint rule may be disabled only on the smallest possible scope with an explanation.
- Generated files are excluded from manual style rules and must not be edited directly.

## 2. Naming

| Item                           | Convention                                 | Example                         |
| ------------------------------ | ------------------------------------------ | ------------------------------- |
| Files and folders              | `kebab-case`                               | `create-reservation.handler.ts` |
| Classes and types              | `PascalCase`                               | `CreateReservationHandler`      |
| Functions and variables        | `camelCase`                                | `calculateAvailableRooms`       |
| Constants and injection tokens | `SCREAMING_SNAKE_CASE`                     | `RESERVATION_READER`            |
| Boolean values                 | Start with `is`, `has`, `can`, or `should` | `isRoomReady`                   |
| Commands                       | Imperative business action plus `Command`  | `ConfirmReservationCommand`     |
| Command handlers               | Command name plus `Handler`                | `ConfirmReservationHandler`     |
| Queries                        | Requested result plus `Query`              | `GetReservationQuery`           |
| Query handlers                 | Query name plus `Handler`                  | `GetReservationHandler`         |
| Repository ports               | Business object plus `RepositoryPort`      | `ReservationRepositoryPort`     |
| Repository adapters            | Technology plus port name                  | `TypeOrmReservationRepository`  |
| TypeORM entities               | Business object plus `OrmEntity`           | `ReservationOrmEntity`          |
| HTTP DTOs                      | Purpose plus `RequestDto` or `ResponseDto` | `CreateReservationRequestDto`   |
| Integration events             | Past-tense business fact                   | `ReservationConfirmed`          |
| Database objects               | `snake_case`                               | `reservation_lines`             |

Interfaces do not use an `I` prefix. Names describe business meaning rather than technical steps.

## 3. Application Use Cases

- One command or query handler represents one application use case.
- Handlers expose one `execute` method and receive dependencies through the constructor.
- Commands and queries are immutable input objects.
- A controller validates transport input, creates a command or query, invokes the handler, and maps the output. It contains no business decisions.
- A handler coordinates domain objects and ports but does not contain SQL, HTTP calls, or transport response logic.
- A use case returns an explicit output model or throws a typed domain or application error.
- HTTP exceptions are created only in the presentation error-mapping layer.
- Cross-module operations use the public contracts defined in `docs/architecture/module-boundaries.md`.
- Transaction and event behavior follows `docs/architecture/module-communication.md`.

Avoid generic services with unrelated methods. Split a service when its methods represent independent workflows or require different dependencies.

## 4. Domain Models

- Aggregates enforce all invariants required for their own state changes.
- New aggregates are created through named factory methods. Rehydration from persistence uses a separate factory or mapper path.
- Entity state is changed through intention-revealing methods rather than public setters.
- Value objects are immutable and validate their values at creation.
- Domain services are stateless and are used only when a rule does not naturally belong to one entity or value object.
- Invalid domain states are rejected immediately with typed domain errors.
- Domain events are raised only after the corresponding state change succeeds.
- Domain code does not import NestJS, TypeORM, HTTP DTOs, configuration, or external SDKs.
- Nullable fields are used only when absence is a valid business state.

Identifiers are generated before persistence so domain objects do not depend on database-generated state.

## 5. DTOs and Validation

- Request and response DTOs are separate classes.
- HTTP DTOs stay inside the owning module's `presentation/http/dto` directory.
- Public module-contract data shapes stay in the provider's `contracts` directory and are not reused as HTTP DTOs.
- TypeORM entities and domain objects are never returned directly from controllers.
- Request DTOs use declarative validation. The global NestJS validation pipe enables transformation, accepts only declared properties, and rejects non-whitelisted properties.
- Transport validation checks shape, format, required fields, and simple ranges.
- Application validation checks authorization, referenced-resource existence, and workflow preconditions.
- Domain validation enforces business invariants.
- Database constraints provide the final protection for uniqueness and concurrency invariants.

Optional input fields use `undefined`. Persisted absence uses `null` only when the database column represents a valid missing value.

## 6. HTTP APIs and Errors

- Public routes are versioned under `/api/v1`.
- Resource paths use plural nouns. Explicit business actions may use action subpaths such as `/reservations/:id/confirm`.
- Successful responses use explicit response DTOs without a universal `data` envelope.
- List endpoints define pagination, a stable sort order, and a maximum page size.
- Repeating a supported idempotent request follows the rules in `docs/architecture/module-communication.md`.

Error responses use this shape:

```json
{
  "code": "RESERVATION_NOT_AVAILABLE",
  "message": "The requested room type is not available for the selected dates.",
  "details": {},
  "correlationId": "c0a8012e-7b4e-4bb0-90e5-6313880df909"
}
```

| Error category                                              | HTTP status |
| ----------------------------------------------------------- | ----------- |
| Invalid request shape or format                             | `400`       |
| Missing or invalid authentication                           | `401`       |
| Insufficient role or disclosed resource ownership           | `403`       |
| Inaccessible private resource when existence must be hidden | `404`       |
| Resource not found                                          | `404`       |
| State or concurrency conflict                               | `409`       |
| Valid input rejected by a business rule                     | `422`       |
| Unexpected failure                                          | `500`       |

Error codes are stable machine-readable contracts. Internal exception messages, SQL details, stack traces, and provider responses are never returned to clients.

## 7. Dates, Time, and Money

- Persist timestamps as PostgreSQL `timestamptz` values in UTC and serialize them as ISO 8601 strings with an explicit offset.
- Use date-only values for hotel business dates such as check-in and check-out dates.
- Stay ranges are half-open: the check-in date is included and the check-out date is excluded.
- Business-time calculations use the configured hotel IANA time zone, never the operating system's local time zone.
- Tests use an injected clock instead of the current system time.
- Monetary values use a `Money` value object with an exact decimal amount and an ISO currency code.
- JavaScript floating-point numbers are prohibited for prices, payments, refunds, invoice totals, and revenue calculations.
- PostgreSQL monetary columns use `numeric`; API monetary amounts are serialized as decimal strings.
- Arithmetic involving different currencies is rejected.

The hotel time zone and operating currency are required validated configuration values, not generic runtime settings managed by a business module.

## 8. TypeORM and Migrations

- Tables, columns, indexes, and constraints use explicit `snake_case` names.
- Primary keys use `id`; reference columns use names such as `customer_id` and `reservation_id`.
- Common timestamps use `created_at` and `updated_at` when the owning aggregate requires them.
- TypeORM columns declare type, nullability, length, precision, and default behavior explicitly.
- Lazy and eager-loading relations are prohibited. Repositories load the data required by a use case explicitly.
- TypeORM relation decorators are limited to entities owned by the same module.
- A cross-module identifier is stored as a scalar. Any cross-module database foreign key requires an architecture review.
- Repository methods express domain intent instead of exposing a general query builder.
- Query builders and raw SQL remain inside infrastructure persistence adapters.
- Production behavior must be tested against PostgreSQL rather than an in-memory database with different locking or type behavior.
- Schema synchronization is disabled in every application environment.

Every schema change uses a migration. An applied migration is never edited or reordered; a corrective migration is added instead. Destructive or long-running migrations require a separate rollout plan.

## 9. Configuration and Secrets

- Configuration is loaded through one technical configuration layer and validated at startup.
- Business code does not read `process.env` directly.
- Required values have no silent production defaults.
- Environment variables use `SCREAMING_SNAKE_CASE` and are mapped to typed configuration objects.
- Secrets are provided through the deployment environment or a secret store and are never committed to the repository.
- Logs, errors, fixtures, and snapshots must not contain access tokens, refresh tokens, passwords, payment credentials, or identification numbers.
- Tests override configuration through typed test configuration rather than mutating global process state inside test cases.

## 10. Logging

- Application logs are structured and machine-readable.
- Request logs include timestamp, severity, message, correlation ID, route, method, status, duration, and authenticated actor ID when available.
- Background logs include correlation ID, causation ID, job or event ID, handler name, attempt number, and outcome.
- Log identifiers and state transitions, not full customer or payment payloads.
- An exception is logged once at the boundary that handles it.
- Expected business rejections are not logged as system errors.
- `console.log` and unstructured production logging are prohibited.

Operational logs support diagnostics and are not an audit business module.

## 11. Testing

| Test type                    | Scope                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Domain unit test             | Aggregate, value object, domain service, and invariant behavior without NestJS or a database    |
| Application unit test        | One use case with fake or mocked outbound ports                                                 |
| Persistence integration test | TypeORM repositories, mappers, migrations, constraints, and transactions against PostgreSQL     |
| Module contract test         | Public contract behavior and provider wiring                                                    |
| HTTP end-to-end test         | Routing, validation, authentication boundary, response mapping, and complete critical workflows |
| Architecture test            | Layer imports, module imports, and prohibited cross-module access                               |

- Test files use the `.spec.ts` suffix. End-to-end tests stay under the root `test` directory.
- Tests are deterministic and control clocks, identifiers, and external adapters.
- Reservation and inventory tests include concurrent attempts for the same room type and dates.
- Payment, refund, invoice issue, event-handler, and scheduled-job tests include duplicate-delivery cases.
- Every fixed defect adds a regression test at the lowest level that reproduces the failure.
- Tests verify observable behavior rather than private implementation details.

## 12. Code Review Checklist

- The change is located in the owning module and correct layer.
- Business rules are not implemented in controllers or persistence entities.
- Cross-module imports use only the provider's public entry point.
- DTOs, domain objects, and TypeORM entities remain separate.
- Transactions, events, retries, and idempotency follow the communication rules.
- New database changes include migrations and PostgreSQL integration coverage.
- Errors and logs do not expose secrets or sensitive customer data.
- Relevant unit, integration, end-to-end, and architecture tests pass.
