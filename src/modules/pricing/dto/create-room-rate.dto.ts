import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsUUID, Matches, Max, Min } from 'class-validator';
import { ROOM_RATE_DATE_PATTERN } from './validation/room-rate-validation';

export class CreateRoomRateDto {
  @ApiProperty({
    description: 'Room Type identifier owned by Room Catalog.',
    example: 'cc1b1967-5755-484c-875e-1b481552581b',
    format: 'uuid',
  })
  @IsUUID()
  roomTypeId!: string;

  @ApiProperty({
    description: 'Inclusive first priced night.',
    example: '2026-09-01',
    format: 'date',
  })
  @Matches(ROOM_RATE_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  startDate!: string;

  @ApiProperty({
    description: 'Exclusive end of the priced range.',
    example: '2026-09-05',
    format: 'date',
  })
  @Matches(ROOM_RATE_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  endDate!: string;

  @ApiProperty({ description: 'VND price for one room night.', example: 1250000 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  pricePerNight!: number;
}
