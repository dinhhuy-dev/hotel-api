import { ApiProperty } from '@nestjs/swagger';

export class AuthenticationResponseDto {
  @ApiProperty({
    description: 'Short-lived JWT access token.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Opaque refresh token.',
    example: 'refresh-token-example',
  })
  refreshToken!: string;
}
