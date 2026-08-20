import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoomTypeDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @Type(() => Number)
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(20)
  maxOccupancy!: number;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bedConfiguration?: string | null;

  @Type(() => Number)
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  displayOrder!: number;
}
