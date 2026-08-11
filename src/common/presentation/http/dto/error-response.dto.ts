import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code returned by the API.',
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'One or more error messages.',
    type: [String],
    example: ['email must be an email'],
  })
  message!: string[];

  @ApiProperty({
    description: 'Error category name.',
    example: 'BadRequest',
  })
  error!: string;

  @ApiProperty({
    description: 'Timestamp when the error response was created.',
    example: '2026-08-11T10:00:00.000Z',
    format: 'date-time',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Request path that produced the error.',
    example: '/api/v1/auth/sign-up',
  })
  path!: string;
}
