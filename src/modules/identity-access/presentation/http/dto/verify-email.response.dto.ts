import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyEmailResponseDto {
  @ApiProperty({
    description: 'Verified account identifier.',
    example: '4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10',
    format: 'uuid',
  })
  accountId!: string;

  @ApiProperty({
    description:
      'Whether the account was already verified before this request.',
    example: false,
  })
  alreadyVerified!: boolean;

  @ApiPropertyOptional({
    description:
      'JWT access token returned when verification activates the account.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description:
      'Opaque refresh token returned when verification activates the account.',
    example: 'refresh-token-example',
  })
  refreshToken?: string;
}
