import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    description: 'Unique physical room number.',
    example: 'A-101',
    minLength: 1,
    maxLength: 20,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  roomNumber!: string;

  @ApiProperty({
    description: 'Physical floor or level of the room.',
    example: 'A',
    minLength: 1,
    maxLength: 10,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  floor!: string;

  @ApiProperty({
    description: 'Identifier of the active room type assigned to the room.',
    example: 'cc1b1967-5755-484c-875e-1b481552581b',
    format: 'uuid',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsUUID()
  roomTypeId!: string;
}
