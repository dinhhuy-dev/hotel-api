import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefreshTokenRequestDto {
  @ApiProperty({
    description: 'Opaque refresh token used to issue a new token pair.',
    example: 'refresh-token-example',
    maxLength: 512,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;
}
