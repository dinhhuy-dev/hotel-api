import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordRequestDto {
  @ApiProperty({
    description: 'Current account password.',
    example: 'CurrentStrongPassword123!',
    format: 'password',
    minLength: 8,
    maxLength: 30,
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(30)
  currentPassword!: string;

  @ApiProperty({
    description: 'New account password.',
    example: 'NewStrongPassword123!',
    format: 'password',
    minLength: 8,
    maxLength: 30,
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(30)
  newPassword!: string;
}
