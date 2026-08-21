import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { OperationalStatus } from '../../entities/enum/operational-status';

export class RoomQueryDto {
  @ApiPropertyOptional({
    description: 'Page number, starting at 1.',
    example: 1,
    default: 1,
    minimum: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'Number of rooms per page.',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
    type: Number,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;

  @ApiPropertyOptional({
    description: 'Search by room number.',
    example: 'A-101',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  search?: string | null;

  @ApiPropertyOptional({
    description: 'Filter by room type identifier.',
    example: 'cc1b1967-5755-484c-875e-1b481552581b',
    format: 'uuid',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsUUID()
  roomTypeId?: string | null;

  @ApiPropertyOptional({
    description: 'Filter by physical floor or level.',
    example: 'A',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  floor?: string | null;

  @ApiPropertyOptional({
    description: 'Filter by operational status.',
    enum: OperationalStatus,
    enumName: 'OperationalStatus',
  })
  @IsOptional()
  @IsEnum(OperationalStatus)
  operationalStatus?: OperationalStatus | null;
}
