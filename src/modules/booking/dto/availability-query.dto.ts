import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AvailabilityQueryDto {
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
    description: 'Number of guests who need accommodation.',
    example: 3,
    minimum: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guestCount!: number;

  @ApiPropertyOptional({
    description: 'Total number of rooms requested.',
    example: 1,
    default: 1,
    minimum: 1,
    maximum: 5,
    type: Number,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  roomQuantity = 1;

  @ApiPropertyOptional({
    description: 'Limit availability to one Room Type identifier.',
    example: 'cc1b1967-5755-484c-875e-1b481552581b',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

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
    description: 'Number of availability options per page.',
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
}
