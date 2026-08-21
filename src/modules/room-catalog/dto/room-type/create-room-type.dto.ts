import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeCode = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const isProvided = (_object: object, value: unknown): boolean => value !== undefined;

export class CreateRoomTypeDto {
  @ApiProperty({
    description: 'Immutable room type code.',
    example: 'DELUXE_KING',
    minLength: 2,
    maxLength: 20,
    pattern: '^[A-Z0-9_-]+$',
  })
  @Transform(normalizeCode)
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/)
  code!: string;

  @ApiProperty({
    description: 'Room type display name.',
    example: 'Deluxe King',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(trimString)
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Optional room type description.',
    example: 'A spacious room with one king bed.',
    maxLength: 1000,
    nullable: true,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty({
    description: 'Maximum number of occupants.',
    example: 2,
    minimum: 1,
    maximum: 20,
  })
  @Type(() => Number)
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(20)
  maxOccupancy!: number;

  @ApiPropertyOptional({
    description: 'Optional bed configuration.',
    example: 'One king bed',
    maxLength: 200,
    nullable: true,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bedConfiguration?: string | null;

  @ApiProperty({
    description: 'Public display order, starting at zero.',
    example: 10,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  displayOrder!: number;

  @ApiPropertyOptional({
    description: 'Active Facility identifiers to assign during creation.',
    example: ['4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10'],
    type: String,
    format: 'uuid',
    isArray: true,
    uniqueItems: true,
  })
  @ValidateIf(isProvided)
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  facilityIds?: string[];
}
