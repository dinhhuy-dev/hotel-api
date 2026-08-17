# Hotel API

## Overview

Hotel API is a backend system for managing one hotel. It provides APIs for room inventory, pricing, customers, reservations, stays, payments, hotel operations, notifications, and reports. Customers can search for available rooms, view prices, make online reservations, and manage their reservations.

The system supports one hotel only. It does not support branches or multiple hotels.

## User Roles

- **Administrator:** Creates accounts, changes account roles, and manages system settings.
- **Hotel Manager:** Manages hotel operations, room prices, room status, staff tasks, and reports.
- **Receptionist:** Manages customers, reservations, check-in, check-out, payments, and invoices.
- **Housekeeping Staff:** Views and updates assigned room-cleaning tasks.
- **Maintenance Staff:** Views and handles room maintenance requests.
- **Customer:** Searches for rooms, views prices, makes reservations, and manages personal information and reservations.

## Functional Scope

### Account Management and RBAC

Users can log in and log out. Role-based access control restricts each function to the appropriate roles. Administrators can create accounts and change an account's role.

### Room Types and Rooms

Administrators and hotel managers can manage room types, capacity, facilities, room numbers, floors, and room status.

### Customers

The system stores customer contact details, identification details, and reservation history. Receptionists can manage customer records, and customers can update their basic information.

### Room Availability

The system checks room availability for a selected date range based on reservations, check-in, check-out, housekeeping, maintenance, and room status.

### Room Pricing

Hotel managers can create and update prices for each room type for a specific date or date range.

### Reservations

Customers can search for available rooms and make online reservations. Receptionists can create, confirm, update, and cancel reservations. The system checks availability before accepting a reservation.

### Check-in and Check-out

Receptionists can confirm guest arrivals, assign rooms, record check-in times, complete check-out, and update room and reservation status.

### Payments and Invoices

The system records deposits, payments, refunds, and payment status. It also creates and stores reservation invoices.

### Housekeeping and Maintenance

Hotel managers can create and assign cleaning and maintenance tasks. Housekeeping and maintenance staff can update their assigned tasks. Room status reflects active cleaning and maintenance work.

### Notifications and Email

The system sends notifications and emails for reservation confirmations, reservation cancellations, payment confirmations, invoices, and check-in reminders.

### Reports and Statistics

Administrators and hotel managers can view basic reports for revenue, reservations, room occupancy, room status, and payments.

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

## Testing

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov
```
