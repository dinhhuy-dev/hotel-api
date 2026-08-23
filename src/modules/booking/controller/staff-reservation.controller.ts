import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiPaginatedSuccessResponse,
  ApiSuccessResponse,
} from 'src/common/decorators/api-success-response.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { ErrorResponseDto } from 'src/common/presentation/http/dto/error-response.dto';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { StaffReservationQueryDto } from '../dto/reservation-query.dto';
import { ReservationResponseDto } from '../dto/reservation-response.dto';
import { ReservationQueryService } from '../services/reservation-query.service';

@ApiTags('Booking Staff Reservations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Access token is missing or invalid.',
})
@ApiForbiddenResponse({
  type: ErrorResponseDto,
  description: 'Receptionist or Hotel Manager role is required.',
})
@Roles(AccountRole.RECEPTIONIST, AccountRole.HOTEL_MANAGER)
@Controller('v1/booking/staff/reservations')
export class StaffReservationController {
  constructor(private readonly service: ReservationQueryService) {}

  @Get()
  @ApiOperation({ summary: 'List reservations for staff' })
  @ApiPaginatedSuccessResponse(ReservationResponseDto, {
    description: 'Reservations retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Reservation list filters are invalid.',
  })
  list(@Query() dto: StaffReservationQueryDto): Promise<PaginatedResult<ReservationResponseDto>> {
    return this.service.listForStaff(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reservation for staff' })
  @ApiParam({ name: 'id', description: 'Reservation identifier.', format: 'uuid' })
  @ApiSuccessResponse(ReservationResponseDto, {
    description: 'Reservation retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Reservation identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Reservation does not exist.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ReservationResponseDto> {
    return this.service.findOneForStaff(id);
  }
}
