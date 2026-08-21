import { ApiProperty } from '@nestjs/swagger';
import { OperationalStatus } from '../../entities/enum/operational-status';
import { PublicFacilityResponseDto } from '../room-type/public-room-type-response.dto';
import { RoomTypeResponseDto } from '../room-type/room-type-response.dto';

export class RoomTypeSummaryDto {
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

  @ApiProperty({ description: 'Maximum number of occupants.', example: 2 })
  maxOccupancy!: number;

  @ApiProperty({ description: 'Bed configuration.', example: 'One king bed', nullable: true })
  bedConfiguration!: string | null;

  @ApiProperty({
    description: 'Facilities assigned to the room type.',
    type: [PublicFacilityResponseDto],
  })
  facilities!: PublicFacilityResponseDto[];
}

export class RoomResponseDto {
  @ApiProperty({
    description: 'Room identifier.',
    example: 'f3f1eb04-7635-4f01-a7df-6637b0abf8de',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Unique physical room number.', example: 'A-101' })
  roomNumber!: string;

  @ApiProperty({ description: 'Physical floor or level.', example: 'A' })
  floor!: string;

  @ApiProperty({
    description: 'Current operational status.',
    enum: OperationalStatus,
    enumName: 'OperationalStatus',
    example: OperationalStatus.OutOfService,
  })
  operationalStatus!: OperationalStatus;

  @ApiProperty({ description: 'Complete assigned room type.', type: RoomTypeResponseDto })
  roomType!: RoomTypeResponseDto;

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
}

export class StaffRoomResponseDto {
  @ApiProperty({
    description: 'Room identifier.',
    example: 'f3f1eb04-7635-4f01-a7df-6637b0abf8de',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Unique physical room number.', example: 'A-101' })
  roomNumber!: string;

  @ApiProperty({ description: 'Physical floor or level.', example: 'A' })
  floor!: string;

  @ApiProperty({
    description: 'Current operational status.',
    enum: OperationalStatus,
    enumName: 'OperationalStatus',
    example: OperationalStatus.Ready,
  })
  operationalStatus!: OperationalStatus;

  @ApiProperty({ description: 'Assigned room type.', type: RoomTypeSummaryDto })
  roomType!: RoomTypeSummaryDto;
}
