import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CONTACT_PHONE_PATTERN = /^\+?\d{8,15}$/;

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateReservationItemDto {
  @ApiProperty({
    description: 'Room Type identifier to reserve.',
    example: 'cc1b1967-5755-484c-875e-1b481552581b',
    format: 'uuid',
  })
  @IsUUID()
  roomTypeId!: string;

  @ApiProperty({
    description: 'Number of rooms of this Room Type.',
    example: 1,
    minimum: 1,
    maximum: 5,
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  quantity!: number;
}

export class CustomerCreateReservationDto {
  @ApiProperty({
    description: 'Contact name stored with the Reservation.',
    example: 'Nguyen Van An',
    minLength: 1,
    maxLength: 100,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contactName!: string;

  @ApiProperty({
    description: 'Contact phone with 8 to 15 digits and an optional leading plus sign.',
    example: '+84901234567',
    pattern: '^\\+?\\d{8,15}$',
  })
  @IsString()
  @Matches(CONTACT_PHONE_PATTERN)
  contactPhone!: string;

  @ApiProperty({
    description: 'Hotel-local check-in date.',
    example: '2026-09-03',
    format: 'date',
  })
  @Matches(CALENDAR_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  checkInDate!: string;

  @ApiProperty({
    description: 'Hotel-local check-out date.',
    example: '2026-09-06',
    format: 'date',
  })
  @Matches(CALENDAR_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  checkOutDate!: string;

  @ApiProperty({
    description: 'Number of guests who will stay.',
    example: 3,
    minimum: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guestCount!: number;

  @ApiProperty({
    description: 'Room Type quantities requested for the Reservation.',
    type: [CreateReservationItemDto],
    minItems: 1,
    maxItems: 5,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CreateReservationItemDto)
  items!: CreateReservationItemDto[];
}

export class ReceptionistCreateReservationDto extends CustomerCreateReservationDto {
  @ApiProperty({
    description: 'Customer identifier supplied by the Receptionist.',
    example: '4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10',
    format: 'uuid',
  })
  @IsUUID()
  customerId!: string;
}
