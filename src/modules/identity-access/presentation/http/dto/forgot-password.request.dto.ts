import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordRequestDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
