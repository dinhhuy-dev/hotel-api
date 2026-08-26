import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityFacilityDto {
  @ApiProperty({
    description: 'Facility identifier.',
    example: '4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Facility display name.', example: 'Free Wi-Fi' })
  name!: string;
}

export class AvailabilityOptionItemDto {
  @ApiProperty({
    description: 'Room Type identifier.',
    example: 'cc1b1967-5755-484c-875e-1b481552581b',
    format: 'uuid',
  })
  roomTypeId!: string;

  @ApiProperty({ description: 'Room Type display name.', example: 'Deluxe King' })
  name!: string;

  @ApiProperty({
    description: 'Room Type description.',
    example: 'A spacious room with one king bed.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    description: 'Number of rooms of this Room Type in the option.',
    example: 1,
    minimum: 1,
    type: Number,
  })
  selectedQuantity!: number;

  @ApiProperty({
    description: 'Maximum number of occupants per room.',
    example: 2,
    minimum: 1,
    type: Number,
  })
  maxOccupancy!: number;

  @ApiProperty({
    description: 'Current available quantity before making a Reservation.',
    example: 4,
    minimum: 1,
    type: Number,
  })
  availableQuantity!: number;

  @ApiProperty({
    description: 'VND price for one room for the requested stay.',
    example: 3750000,
    minimum: 1,
    type: Number,
  })
  pricePerRoomStay!: number;

  @ApiProperty({
    description: 'VND subtotal for this selected Room Type quantity.',
    example: 3750000,
    minimum: 1,
    type: Number,
  })
  subtotal!: number;

  @ApiProperty({
    description: 'Active Facilities assigned to the Room Type.',
    type: [AvailabilityFacilityDto],
  })
  facilities!: AvailabilityFacilityDto[];
}

export class AvailabilityOptionDto {
  @ApiProperty({
    description: 'Selected Room Types in this availability option.',
    type: [AvailabilityOptionItemDto],
  })
  items!: AvailabilityOptionItemDto[];

  @ApiProperty({
    description: 'Total number of rooms in this option.',
    example: 2,
    minimum: 1,
    maximum: 5,
    type: Number,
  })
  totalRoomQuantity!: number;

  @ApiProperty({
    description: 'Total guest capacity across the selected rooms.',
    example: 4,
    minimum: 1,
    type: Number,
  })
  totalCapacity!: number;

  @ApiProperty({
    description: 'Total VND price for all selected rooms for the requested stay.',
    example: 7500000,
    minimum: 1,
    type: Number,
  })
  totalPrice!: number;
}
