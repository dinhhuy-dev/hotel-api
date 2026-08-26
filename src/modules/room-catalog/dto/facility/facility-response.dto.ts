import { ApiProperty } from '@nestjs/swagger';

export class FacilityResponseDto {
  @ApiProperty({
    description: 'Facility identifier.',
    example: '4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Facility display name.',
    example: 'Free Wi-Fi',
  })
  name!: string;

  @ApiProperty({
    description: 'Facility description.',
    example: 'High-speed wireless internet access.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    description: 'Whether the facility is active.',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Creation timestamp.',
    example: '2026-08-19T10:00:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp.',
    example: '2026-08-19T10:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: string;
}
