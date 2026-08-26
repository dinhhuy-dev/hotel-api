import { ApiProperty } from '@nestjs/swagger';

export class SignUpResponseDto {
  @ApiProperty({
    description: 'Newly created account identifier.',
    example: '4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10',
    format: 'uuid',
  })
  accountId!: string;

  @ApiProperty({
    description: 'Whether the verification email was sent successfully.',
    example: true,
  })
  verificationEmailSent!: boolean;
}
