import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordResponseDto {
  @ApiProperty({
    description:
      'Generic message that does not disclose whether the account exists.',
    example:
      'We will send a link to reset your password if your account exists.',
  })
  message!: string;
}
