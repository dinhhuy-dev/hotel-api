import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { ROOM_RATE_DATE_PATTERN } from './validation/room-rate-validation';

export class UpdateRoomRateDto {
  @ApiPropertyOptional({
    description: 'Inclusive first priced night.',
    example: '2026-09-02',
    format: 'date',
  })
  @IsOptional()
  @Matches(ROOM_RATE_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Exclusive end of the priced range.',
    example: '2026-09-06',
    format: 'date',
  })
  @IsOptional()
  @Matches(ROOM_RATE_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  endDate?: string;

  @ApiPropertyOptional({ description: 'VND price for one room night.', example: 1400000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  pricePerNight?: number;
}
