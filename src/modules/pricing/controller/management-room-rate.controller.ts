import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
  ApiSuccessVoidResponse,
} from 'src/common/decorators/api-success-response.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { ErrorResponseDto } from 'src/common/presentation/http/dto/error-response.dto';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { CreateRoomRateDto } from '../dto/create-room-rate.dto';
import { RoomRateQueryDto } from '../dto/room-rate-query.dto';
import { RoomRateResponseDto } from '../dto/room-rate-response.dto';
import { UpdateRoomRateDto } from '../dto/update-room-rate.dto';
import { RoomRateService } from '../services/room-rate.service';

@ApiTags('Pricing Management Room Rates')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Access token is missing or invalid.',
})
@ApiForbiddenResponse({
  type: ErrorResponseDto,
  description: 'Administrator or Hotel Manager role is required.',
})
@Roles(AccountRole.ADMINISTRATOR, AccountRole.HOTEL_MANAGER)
@Controller('v1/pricing/management/room-rates')
export class ManagementRoomRateController {
  constructor(private readonly service: RoomRateService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a room rate',
    description: 'Create a future non-overlapping Room Rate for an active Room Type.',
  })
  @ApiSuccessResponse(RoomRateResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Room rate created successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room rate request, range, or VND price is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room Type does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Room Type is inactive or the range overlaps another Room Rate.',
  })
  create(@Body() dto: CreateRoomRateDto): Promise<RoomRateResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List room rates',
    description:
      'Return complete stored Room Rates, optionally filtered by Room Type and an overlap window.',
  })
  @ApiPaginatedSuccessResponse(RoomRateResponseDto, {
    description: 'Room rates retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Pagination, Room Type, or paired date filters are invalid.',
  })
  list(@Query() dto: RoomRateQueryDto): Promise<PaginatedResult<RoomRateResponseDto>> {
    return this.service.list(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a room rate',
    description: 'Return a past, current, or future Room Rate by identifier.',
  })
  @ApiParam({ name: 'id', description: 'Room Rate identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomRateResponseDto, {
    description: 'Room rate retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room Rate identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room Rate does not exist.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoomRateResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a room rate',
    description: 'Update an unstarted Room Rate without changing its Room Type.',
  })
  @ApiParam({ name: 'id', description: 'Room Rate identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomRateResponseDto, {
    description: 'Room rate updated successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room Rate identifier, request, range, or VND price is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room Rate or Room Type does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The rate has started, the Room Type is inactive, or another range overlaps.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomRateDto,
  ): Promise<RoomRateResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a room rate',
    description: 'Hard delete a Room Rate only while it has not started.',
  })
  @ApiParam({ name: 'id', description: 'Room Rate identifier.', format: 'uuid' })
  @ApiSuccessVoidResponse({ description: 'Room rate deleted successfully.' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room Rate identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room Rate does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Room Rate has already started.',
  })
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.delete(id);
  }
}
