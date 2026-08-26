import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedSuccessResponse } from 'src/common/decorators/api-success-response.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { ErrorResponseDto } from 'src/common/presentation/http/dto/error-response.dto';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';
import { AvailabilityOptionDto } from '../dto/availability-response.dto';
import { AvailabilityService } from '../services/availability.service';

@ApiTags('Booking Availability')
@Public()
@Controller('v1/booking/availability')
export class PublicAvailabilityController {
  constructor(private readonly service: AvailabilityService) {}

  @Get()
  @ApiOperation({
    summary: 'Search room availability',
    description: 'Return complete mixed room type options for the requested stay.',
  })
  @ApiPaginatedSuccessResponse(AvailabilityOptionDto, {
    description: 'Availability options retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Availability fields or range are invalid, or the candidate set is too broad.',
  })
  search(@Query() dto: AvailabilityQueryDto): Promise<PaginatedResult<AvailabilityOptionDto>> {
    return this.service.search(dto);
  }
}
