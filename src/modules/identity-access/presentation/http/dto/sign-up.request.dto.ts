import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SignUpRequestDto {
  @ApiProperty({
    description: 'Account email address.',
    example: 'guest@example.com',
    format: 'email',
    maxLength: 320,
  })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({
    description: 'Account password.',
    example: 'StrongPassword123!',
    format: 'password',
    minLength: 8,
    maxLength: 30,
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(30)
  password!: string;
}
