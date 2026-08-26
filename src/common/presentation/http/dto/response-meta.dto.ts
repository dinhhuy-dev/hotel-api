import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({
    description: 'Current page number.',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Maximum number of items returned per page.',
    example: 20,
  })
  pageSize!: number;

  @ApiProperty({
    description: 'Total number of matching items.',
    example: 100,
  })
  totalItems!: number;

  @ApiProperty({
    description: 'Total number of available pages.',
    example: 5,
  })
  totalPages!: number;
}

export class ResponseMetaDto {
  @ApiProperty({
    description: 'Unique identifier of the HTTP request.',
    example: 'request-id-123',
  })
  requestId!: string;

  @ApiProperty({
    description: 'Timestamp when the response was created.',
    example: '2026-08-11T10:00:00.000Z',
    format: 'date-time',
  })
  timestamp!: string;

  @ApiPropertyOptional({
    description: 'Pagination information for a paginated response.',
    type: PaginationMetaDto,
  })
  pagination?: PaginationMetaDto;
}
