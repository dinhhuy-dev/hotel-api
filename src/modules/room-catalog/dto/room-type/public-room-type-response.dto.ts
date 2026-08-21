import { ApiProperty } from '@nestjs/swagger';

export class PublicFacilityResponseDto {
  @ApiProperty({
    description: 'Facility identifier.',
    example: '4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Facility display name.', example: 'Free Wi-Fi' })
  name!: string;

  @ApiProperty({
    description: 'Facility description.',
    example: 'High-speed wireless internet access.',
    nullable: true,
  })
  description!: string | null;
}

export class PublicRoomTypeListItemDto {
  @ApiProperty({
    description: 'Room type identifier.',
    example: 'cc1b1967-5755-484c-875e-1b481552581b',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Room type code.', example: 'DELUXE_KING' })
  code!: string;

  @ApiProperty({ description: 'Room type display name.', example: 'Deluxe King' })
  name!: string;

  @ApiProperty({ description: 'Maximum number of occupants.', example: 2 })
  maxOccupancy!: number;

  @ApiProperty({ description: 'Bed configuration.', example: 'One king bed', nullable: true })
  bedConfiguration!: string | null;

  @ApiProperty({ description: 'Public display order.', example: 10 })
  displayOrder!: number;
}

export class PublicRoomTypeDetailDto extends PublicRoomTypeListItemDto {
  @ApiProperty({
    description: 'Room type description.',
    example: 'A spacious room with one king bed.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    description: 'Active Facilities assigned to the room type.',
    type: [PublicFacilityResponseDto],
  })
  facilities!: PublicFacilityResponseDto[];
}
