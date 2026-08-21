import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

const isProvided = (_object: object, value: unknown): boolean => value !== undefined;

export class UpdateRoomDto {
  @ApiPropertyOptional({
    description: 'Unique physical room number.',
    example: 'A-101',
    minLength: 1,
    maxLength: 20,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @ValidateIf(isProvided)
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  roomNumber?: string;

  @ApiPropertyOptional({
    description: 'Physical floor or level of the room.',
    example: 'A',
    minLength: 1,
    maxLength: 10,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @ValidateIf(isProvided)
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  floor?: string;

  @ApiPropertyOptional({
    description: 'Identifier of the active room type assigned to the room.',
    example: 'cc1b1967-5755-484c-875e-1b481552581b',
    format: 'uuid',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf(isProvided)
  @IsNotEmpty()
  @IsUUID()
  roomTypeId?: string;
}
