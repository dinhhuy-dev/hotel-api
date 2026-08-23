import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
import { ROOM_RATE_DATE_PATTERN } from './validation/room-rate-validation';

export class RoomRateQueryDto {
  @ApiPropertyOptional({ description: 'Page number, starting at 1.', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'Number of room rates per page.',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({
    description: 'Filter by Room Type identifier.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @ApiPropertyOptional({
    description: 'Inclusive start of an overlap filter. Must be supplied with toDate.',
    example: '2026-09-03',
    format: 'date',
  })
  @IsOptional()
  @Matches(ROOM_RATE_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Exclusive end of an overlap filter. Must be supplied with fromDate.',
    example: '2026-09-12',
    format: 'date',
  })
  @IsOptional()
  @Matches(ROOM_RATE_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  toDate?: string;
}
