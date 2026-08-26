import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ReservationStatus } from '../entities/enum/reservation-status';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CustomerReservationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number, starting at 1.',
    example: 1,
    default: 1,
    minimum: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'Number of Reservations per page.',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
    type: Number,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({
    description: 'Filter by Reservation status.',
    enum: ReservationStatus,
    enumName: 'ReservationStatus',
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}

export class StaffReservationQueryDto extends CustomerReservationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by Customer identifier.',
    example: '4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by exact hotel-local check-in date.',
    example: '2026-09-03',
    format: 'date',
  })
  @IsOptional()
  @Matches(CALENDAR_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  checkInDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by exact hotel-local check-out date.',
    example: '2026-09-06',
    format: 'date',
  })
  @IsOptional()
  @Matches(CALENDAR_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  checkOutDate?: string;
}
