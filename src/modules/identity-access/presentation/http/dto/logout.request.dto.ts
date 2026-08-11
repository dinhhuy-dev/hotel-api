import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LogoutRequestDto {
  @ApiProperty({
    description: 'Refresh token to revoke.',
    example: 'refresh-token-example',
    maxLength: 512,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;
}
