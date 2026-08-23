import { ApiProperty } from '@nestjs/swagger';

export class RoomRateResponseDto {
  @ApiProperty({
    description: 'Room Rate identifier.',
    example: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Room Type identifier owned by Room Catalog.',
    example: 'cc1b1967-5755-484c-875e-1b481552581b',
    format: 'uuid',
  })
  roomTypeId!: string;

  @ApiProperty({ description: 'Inclusive first priced night.', example: '2026-09-01' })
  startDate!: string;

  @ApiProperty({ description: 'Exclusive end of the priced range.', example: '2026-09-05' })
  endDate!: string;

  @ApiProperty({ description: 'VND price for one room night.', example: 1250000 })
  pricePerNight!: number;

  @ApiProperty({
    description: 'Creation timestamp.',
    example: '2026-08-23T01:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp.',
    example: '2026-08-23T01:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
