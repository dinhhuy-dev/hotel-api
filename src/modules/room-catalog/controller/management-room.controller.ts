import {
  Body,
  Controller,
  Delete,
  Get,
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
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  ApiPaginatedSuccessResponse,
  ApiSuccessResponse,
} from 'src/common/decorators/api-success-response.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { ErrorResponseDto } from 'src/common/presentation/http/dto/error-response.dto';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { CreateRoomDto } from '../dto/room/create-room.dto';
import { RoomQueryDto } from '../dto/room/room-query.dto';
import { RoomResponseDto } from '../dto/room/room-response.dto';
import { UpdateRoomStatusDto } from '../dto/room/update-room-status.dto';
import { UpdateRoomDto } from '../dto/room/update-room.dto';
import { RoomService } from '../services/room.service';

@ApiTags('Room Catalog Management Rooms')
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
@Controller('v1/room-catalog/management/rooms')
export class ManagementRoomController {
  constructor(private readonly service: RoomService) {}

  @Get()
  @ApiOperation({
    summary: 'List rooms',
    description: 'Return a paginated management view of active and retired rooms.',
  })
  @ApiPaginatedSuccessResponse(RoomResponseDto, {
    description: 'Rooms retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room query parameters are invalid.',
  })
  list(@Query() dto: RoomQueryDto): Promise<PaginatedResult<RoomResponseDto>> {
    return this.service.list(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a room',
    description: 'Return an active or retired room by identifier.',
  })
  @ApiParam({ name: 'id', description: 'Room identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomResponseDto, {
    description: 'Room retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room does not exist.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoomResponseDto> {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a room',
    description: 'Create a room in OUT_OF_SERVICE status with an active room type.',
  })
  @ApiSuccessResponse(RoomResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Room created successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room request body is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'The requested room type does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The room number already exists or the requested room type is inactive.',
  })
  create(@Body() dto: CreateRoomDto): Promise<RoomResponseDto> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update room metadata',
    description:
      'Update room number, floor, or room type. Room type changes require OUT_OF_SERVICE status.',
  })
  @ApiParam({ name: 'id', description: 'Room identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomResponseDto, {
    description: 'Room updated successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room identifier or request body is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room or requested room type does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description:
      'The room is retired, the room number already exists, the room type is inactive, or the status does not allow a room type change.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ): Promise<RoomResponseDto> {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update room operational status',
    description: 'Change a room status through an allowed operational transition.',
  })
  @ApiParam({ name: 'id', description: 'Room identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomResponseDto, {
    description: 'Room operational status updated successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room identifier or status request is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room does not exist.',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'The requested room operational status transition is invalid.',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomStatusDto,
  ): Promise<RoomResponseDto> {
    return this.service.updateStatus(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Retire a room',
    description: 'Transition a room to RETIRED status without deleting its record.',
  })
  @ApiParam({ name: 'id', description: 'Room identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomResponseDto, {
    description: 'Room retired successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room does not exist.',
  })
  retire(@Param('id', ParseUUIDPipe) id: string): Promise<RoomResponseDto> {
    return this.service.retire(id);
  }

  @Patch(':id/restore')
  @ApiOperation({
    summary: 'Restore a room',
    description: 'Restore a retired room to OUT_OF_SERVICE status when its room type is active.',
  })
  @ApiParam({ name: 'id', description: 'Room identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomResponseDto, {
    description: 'Room restored successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room or its room type does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'The room is not retired or its room type is inactive.',
  })
  restore(@Param('id', ParseUUIDPipe) id: string): Promise<RoomResponseDto> {
    return this.service.restore(id);
  }
}
