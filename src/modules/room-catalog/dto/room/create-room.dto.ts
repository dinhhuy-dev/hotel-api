import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  roomNumber!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  floor!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsUUID()
  roomTypeId!: string;
}
