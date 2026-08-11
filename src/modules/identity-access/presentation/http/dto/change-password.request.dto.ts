import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(30)
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(30)
  newPassword!: string;
}
