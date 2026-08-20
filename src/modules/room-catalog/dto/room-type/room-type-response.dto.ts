import { FacilityResponseDto } from '../facility/facility-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class RoomTypeResponseDto {
  @ApiProperty({
    description: 'Room type identifier.',
    example: 'cc1b1967-5755-484c-875e-1b481552581b',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Immutable room type code.', example: 'DELUXE_KING' })
  code!: string;

  @ApiProperty({ description: 'Room type display name.', example: 'Deluxe King' })
  name!: string;

  @ApiProperty({
    description: 'Room type description.',
    example: 'A spacious room with one king bed.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ description: 'Maximum number of occupants.', example: 2 })
  maxOccupancy!: number;

  @ApiProperty({ description: 'Bed configuration.', example: 'One king bed', nullable: true })
  bedConfiguration!: string | null;

  @ApiProperty({ description: 'Public display order.', example: 10 })
  displayOrder!: number;

  @ApiProperty({ description: 'Whether the room type is active.', example: true })
  isActive!: boolean;

  @ApiProperty({
    description: 'Creation timestamp.',
    example: '2026-08-20T01:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp.',
    example: '2026-08-20T01:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;

  @ApiProperty({ description: 'Assigned Facilities.', type: [FacilityResponseDto] })
  facilities!: FacilityResponseDto[];
}
