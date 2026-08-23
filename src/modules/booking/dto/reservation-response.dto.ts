import { ApiProperty } from '@nestjs/swagger';
import { CancellationReason } from '../entities/enum/cancellation-reason';
import { PaymentStatus } from '../entities/enum/payment-status';
import { ReservationStatus } from '../entities/enum/reservation-status';

export class ReservationItemResponseDto {
  @ApiProperty({
    description: 'Reserved Room Type identifier.',
    example: 'cc1b1967-5755-484c-875e-1b481552581b',
    format: 'uuid',
  })
  roomTypeId!: string;

  @ApiProperty({
    description: 'Number of reserved rooms of this Room Type.',
    example: 1,
    minimum: 1,
    maximum: 5,
    type: Number,
  })
  quantity!: number;

  @ApiProperty({
    description: 'Accepted VND price for this Reservation item.',
    example: 3750000,
    minimum: 1,
    type: Number,
  })
  totalPrice!: number;
}

export class RoomAssignmentResponseDto {
  @ApiProperty({
    description: 'Assigned physical Room identifier.',
    example: '82c7af16-922d-45af-b79f-163dc94bd200',
    format: 'uuid',
  })
  roomId!: string;

  @ApiProperty({ description: 'Assigned physical room number.', example: 'A-101' })
  roomNumber!: string;
}

export class ReservationResponseDto {
  @ApiProperty({
    description: 'Reservation identifier.',
    example: 'f2b466c8-d90e-40ae-a096-f750baa09ac9',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Customer identifier that owns the Reservation.',
    example: '4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10',
    format: 'uuid',
  })
  customerId!: string;

  @ApiProperty({ description: 'Stored contact name.', example: 'Nguyen Van An' })
  contactName!: string;

  @ApiProperty({ description: 'Stored contact phone.', example: '+84901234567' })
  contactPhone!: string;

  @ApiProperty({
    description: 'Inclusive hotel-local check-in date.',
    example: '2026-09-03',
    format: 'date',
  })
  checkInDate!: string;

  @ApiProperty({
    description: 'Exclusive hotel-local check-out date.',
    example: '2026-09-06',
    format: 'date',
  })
  checkOutDate!: string;

  @ApiProperty({
    description: 'Number of guests included in the Reservation.',
    example: 3,
    minimum: 1,
    type: Number,
  })
  guestCount!: number;

  @ApiProperty({
    description: 'Current Reservation lifecycle status.',
    enum: ReservationStatus,
    enumName: 'ReservationStatus',
  })
  status!: ReservationStatus;

  @ApiProperty({
    description: 'Accepted total VND amount for the Reservation.',
    example: 7500000,
    minimum: 1,
    type: Number,
  })
  totalAmount!: number;

  @ApiProperty({
    description: 'UTC expiration time for the original pending inventory hold.',
    example: '2026-09-01T08:15:00.000Z',
    format: 'date-time',
  })
  expiresAt!: string;

  @ApiProperty({
    description: 'Current payment status.',
    enum: PaymentStatus,
    enumName: 'PaymentStatus',
  })
  paymentStatus!: PaymentStatus;

  @ApiProperty({
    description: 'Cancellation reason when the Reservation is cancelled.',
    enum: CancellationReason,
    enumName: 'CancellationReason',
    nullable: true,
  })
  cancellationReason!: CancellationReason | null;

  @ApiProperty({
    description: 'UTC time when check-in completed.',
    example: '2026-09-03T07:30:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  checkedInAt!: string | null;

  @ApiProperty({
    description: 'UTC time when check-out completed.',
    example: '2026-09-06T03:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  checkedOutAt!: string | null;

  @ApiProperty({
    description: 'UTC time when the Reservation was created.',
    example: '2026-09-01T08:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'UTC time when the Reservation was last updated.',
    example: '2026-09-01T08:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;

  @ApiProperty({
    description: 'Accepted Room Type and price snapshots.',
    type: [ReservationItemResponseDto],
  })
  items!: ReservationItemResponseDto[];

  @ApiProperty({
    description: 'Physical Rooms assigned after check-in.',
    type: [RoomAssignmentResponseDto],
  })
  assignments!: RoomAssignmentResponseDto[];
}
