import { ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RoomTypeFacilityIdsDto {
  @ApiProperty({
    description: 'Unique Facility identifiers for the bulk assignment operation.',
    example: ['4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10'],
    type: String,
    format: 'uuid',
    isArray: true,
    uniqueItems: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  facilityIds!: string[];
}
