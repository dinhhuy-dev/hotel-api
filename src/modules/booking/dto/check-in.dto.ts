import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class CheckInDto {
  @ApiProperty({
    description: 'Distinct physical Room identifiers to assign to the Reservation.',
    type: String,
    format: 'uuid',
    isArray: true,
    minItems: 1,
    maxItems: 5,
    uniqueItems: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  roomIds!: string[];
}
