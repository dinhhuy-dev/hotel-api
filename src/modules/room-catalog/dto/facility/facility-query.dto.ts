import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
};

export class FacilityQueryDto {
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
    description: 'Number of facilities per page.',
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
    description: 'Search by facility name.',
    example: 'Wi-Fi',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  search?: string | null;

  @ApiPropertyOptional({
    description: 'Filter by active state.',
    example: true,
    type: Boolean,
  })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean | null;
}
