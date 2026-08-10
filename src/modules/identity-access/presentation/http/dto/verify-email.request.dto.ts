import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyEmailRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;
}
