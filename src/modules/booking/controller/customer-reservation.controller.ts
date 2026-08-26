import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
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
import type { AuthenticatedUser } from 'src/modules/identity-access/presentation/http/security/authenticated-user';
import { CurrentUser } from 'src/modules/identity-access/presentation/http/security/current-user.decorator';
import { CustomerCreateReservationDto } from '../dto/create-reservation.dto';
import { CustomerReservationQueryDto } from '../dto/reservation-query.dto';
import { ReservationResponseDto } from '../dto/reservation-response.dto';
import { ReservationCommandService } from '../services/reservation-command.service';
import { ReservationQueryService } from '../services/reservation-query.service';
import { IdempotencyKey } from './idempotency-key.decorator';

@ApiTags('Booking Customer Reservations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Access token is missing or invalid.',
})
@ApiForbiddenResponse({
  type: ErrorResponseDto,
  description: 'Customer role is required.',
})
@Roles(AccountRole.CUSTOMER)
@Controller('v1/booking/customer/reservations')
export class CustomerReservationController {
  constructor(
    private readonly commandService: ReservationCommandService,
    private readonly queryService: ReservationQueryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an owned reservation' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Globally unique Reservation creation request identifier.',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiSuccessResponse(ReservationResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Reservation created or replayed successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Reservation fields, stay range, items, or guest capacity are invalid.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Idempotency, Room Type, availability, or Pricing conflict.',
  })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @IdempotencyKey(new ParseUUIDPipe()) idempotencyKey: string,
    @Body() dto: CustomerCreateReservationDto,
  ): Promise<ReservationResponseDto> {
    return this.commandService.createForCustomer(currentUser.accountId, idempotencyKey, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List owned reservations' })
  @ApiPaginatedSuccessResponse(ReservationResponseDto, {
    description: 'Owned Reservations retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Reservation list filters are invalid.',
  })
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() dto: CustomerReservationQueryDto,
  ): Promise<PaginatedResult<ReservationResponseDto>> {
    return this.queryService.listForCustomer(currentUser.accountId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an owned reservation' })
  @ApiParam({ name: 'id', description: 'Reservation identifier.', format: 'uuid' })
  @ApiSuccessResponse(ReservationResponseDto, {
    description: 'Owned Reservation retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Reservation identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Reservation does not exist or is not owned by the Customer.',
  })
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReservationResponseDto> {
    return this.queryService.findOneForCustomer(currentUser.accountId, id);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request payment for an owned reservation' })
  @ApiParam({ name: 'id', description: 'Reservation identifier.', format: 'uuid' })
  @ApiSuccessResponse(ReservationResponseDto, {
    status: HttpStatus.ACCEPTED,
    description: 'Payment requested successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Reservation identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Reservation does not exist or is not owned by the Customer.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Reservation cannot be paid in its current state.',
  })
  pay(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReservationResponseDto> {
    return this.commandService.requestPaymentForCustomer(currentUser.accountId, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an owned reservation' })
  @ApiParam({ name: 'id', description: 'Reservation identifier.', format: 'uuid' })
  @ApiSuccessResponse(ReservationResponseDto, {
    description: 'Reservation cancelled or replayed successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Reservation identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Reservation does not exist or is not owned by the Customer.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Reservation cannot be cancelled in its current state.',
  })
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReservationResponseDto> {
    return this.commandService.cancelForCustomer(currentUser.accountId, id);
  }
}
