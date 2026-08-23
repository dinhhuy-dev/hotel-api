# Hotel API

## Overview

Hotel API is a backend system for managing one hotel. The current implementation provides authentication and RBAC, Room Catalog, Pricing, and the Booking MVP. Customers can search priced availability, create Reservations, view owned Reservations, request mock payment, and cancel Reservations.

The system supports one hotel only. It does not support branches or multiple hotels.

Customer profiles, real Payment processing, Housekeeping tasks, and Maintenance workflows remain future modules. Booking uses the authenticated account ID as a mock Customer ID, an always-successful local payment and refund handler, and a no-op post-check-out Housekeeping handler.

## User Roles

- **Administrator:** Creates accounts, changes account roles, and manages Room Catalog and Pricing data.
- **Hotel Manager:** Manages Room Catalog and Pricing data and reads Reservations.
- **Receptionist:** Creates Reservations, requests mock payment, cancels or marks no-show, and performs check-in and check-out.
- **Housekeeping Staff:** Has an authenticated role, while Housekeeping task APIs remain future scope.
- **Maintenance Staff:** Has an authenticated role, while Maintenance workflow APIs remain future scope.
- **Customer:** Searches priced availability and creates, reads, pays, or cancels owned Reservations.

## Functional Scope

### Account Management and RBAC

Users can log in and log out. Role-based access control restricts each function to the appropriate roles. Administrators can create accounts and change an account's role.

### Room Types and Rooms

Administrators and hotel managers can manage room types, capacity, facilities, room numbers, floors, and room status.

### Customers

A real Customer profile module remains future scope. Booking stores immutable contact name and phone snapshots on each Reservation and uses account IDs or Receptionist-supplied UUIDs as mock Customer identifiers.

### Room Availability

Booking combines sellable Room Catalog capacity, overlapping Reservation commitments, and complete Pricing coverage for the selected stay. Public search returns bounded, sorted, priced combinations of Room Types.

### Room Pricing

Administrators and hotel managers can manage future date-ranged nightly prices for Room Types and read pricing history. Pricing exposes an internal bulk stay-quote contract that Booking uses for public availability and final Reservation price checks.

### Reservations

Customers and Receptionists can create immutable multi-room Reservations. Customers can read and cancel only their own Reservations. Receptionists and Hotel Managers can read Reservations, while Receptionists can request mock payment, cancel, or mark no-show. Mock payment success confirms an unexpired pending Reservation. Changes require cancellation and recreation.

### Check-in and Check-out

Receptionists can assign exact `READY` physical Rooms and check in a paid confirmed Reservation during its stay window. Check-out releases assignments, marks the Rooms `DIRTY`, records one check-out timestamp, and publishes a local no-op Housekeeping event after commit.

### Payments

Booking stores one full mock charge and one full mock refund state per Reservation. Local in-process handlers always succeed. Deposits, payment history, gateway callbacks, and a real Payment module remain future scope.

### Housekeeping and Maintenance

Housekeeping and Maintenance modules are not implemented. Booking only marks checked-out Rooms `DIRTY` and sends a local event to a no-op Housekeeping handler.

## Architecture

The application uses a NestJS modular monolith architecture.

- The `identity-access` module uses Clean Architecture.
- Other business modules use a standard NestJS layered structure with modules, controllers, services, repositories, DTOs, and entities.

## Technology Stack

- NestJS 11
- TypeScript
- Express
- PostgreSQL
- TypeORM
- JWT authentication
- Role-based access control
- Jest

## Installation

Install the project dependencies:

```bash
npm install
```

## Running the Application

```bash
# Development
npm run start

# Watch mode
npm run start:dev

# Production
npm run build
npm run start:prod
```

The application uses the `PORT` environment variable when provided and listens on port `3000` by default.

## Development Seed Data

Development seed data is available for Identity Access and Room Catalog. Apply all migrations before running a seed:

```bash
npm run migration:run
```

Set `SEED_ACCOUNT_PASSWORD` in `.env` to a password containing 8 to 30 characters. The Identity Access seed uses this password for all seeded accounts:

- `administrator@hotel.test`
- `hotel-manager@hotel.test`
- `receptionist@hotel.test`
- `housekeeping-staff@hotel.test`
- `maintenance-staff@hotel.test`
- `customer@hotel.test`

Run one module seed or both seeds:

```bash
npm run seed:identity
npm run seed:room-catalog
npm run seed
```

The commands refuse to run when `NODE_ENV=production`. Repeated runs skip compatible seed rows and fail instead of overwriting conflicting existing data.

## Testing

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov
```
