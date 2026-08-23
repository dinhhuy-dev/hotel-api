import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
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
import { ApiSuccessResponse } from 'src/common/decorators/api-success-response.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ErrorResponseDto } from 'src/common/presentation/http/dto/error-response.dto';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { ReceptionistCreateReservationDto } from '../dto/create-reservation.dto';
import { ReservationResponseDto } from '../dto/reservation-response.dto';
import { ReservationCommandService } from '../services/reservation-command.service';
import { IdempotencyKey } from './idempotency-key.decorator';

@ApiTags('Booking Receptionist Reservations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Access token is missing or invalid.',
})
@ApiForbiddenResponse({
  type: ErrorResponseDto,
  description: 'Receptionist role is required.',
})
@Roles(AccountRole.RECEPTIONIST)
@Controller('v1/booking/receptionist/reservations')
export class ReceptionistReservationController {
  constructor(private readonly service: ReservationCommandService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reservation for a Customer' })
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
    @IdempotencyKey(new ParseUUIDPipe()) idempotencyKey: string,
    @Body() dto: ReceptionistCreateReservationDto,
  ): Promise<ReservationResponseDto> {
    return this.service.createForReceptionist(idempotencyKey, dto);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request payment for a reservation' })
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
    description: 'Reservation does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Reservation cannot be paid in its current state.',
  })
  pay(@Param('id', ParseUUIDPipe) id: string): Promise<ReservationResponseDto> {
    return this.service.requestPaymentForReceptionist(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a reservation' })
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
    description: 'Reservation does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Reservation cannot be cancelled in its current state.',
  })
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<ReservationResponseDto> {
    return this.service.cancelForReceptionist(id);
  }

  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a reservation as no-show' })
  @ApiParam({ name: 'id', description: 'Reservation identifier.', format: 'uuid' })
  @ApiSuccessResponse(ReservationResponseDto, {
    description: 'Reservation marked as no-show successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Reservation identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Reservation does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Reservation cannot be marked as no-show in its current state or stay window.',
  })
  markNoShow(@Param('id', ParseUUIDPipe) id: string): Promise<ReservationResponseDto> {
    return this.service.markNoShow(id);
  }
}
