import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LogoutRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;
}
