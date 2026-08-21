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
} from '@nestjs/swagger';
import {
  ApiPaginatedSuccessResponse,
  ApiSuccessResponse,
} from 'src/common/decorators/api-success-response.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ErrorResponseDto } from 'src/common/presentation/http/dto/error-response.dto';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { CreateRoomTypeDto } from '../dto/room-type/create-room-type.dto';
import { RoomTypeService } from '../services/room-type.service';
import { RoomTypeResponseDto } from '../dto/room-type/room-type-response.dto';
import { RoomTypeQueryDto } from '../dto/room-type/room-type-query.dto';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { UpdateRoomTypeDto } from '../dto/room-type/update-room-type.dto';
import { RoomTypeFacilityIdsDto } from '../dto/room-type/room-type-facility-ids.dto';

@ApiTags('Room Catalog Management Room Types')
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
@Controller('v1/room-catalog/management/room-types')
export class ManagementRoomTypeController {
  constructor(private readonly service: RoomTypeService) {}

  @Get()
  @ApiOperation({
    summary: 'List room types',
    description: 'Return a paginated management view of active and inactive room types.',
  })
  @ApiPaginatedSuccessResponse(RoomTypeResponseDto, {
    description: 'Room types retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room type query parameters are invalid.',
  })
  list(@Query() dto: RoomTypeQueryDto): Promise<PaginatedResult<RoomTypeResponseDto>> {
    return this.service.list(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a room type',
    description: 'Return an active or inactive room type by identifier.',
  })
  @ApiParam({ name: 'id', description: 'Room type identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomTypeResponseDto, {
    description: 'Room type retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room type identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room type does not exist.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoomTypeResponseDto> {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a room type',
    description: 'Create an active room type and optionally assign active Facilities.',
  })
  @ApiSuccessResponse(RoomTypeResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Room type created successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room type request is invalid or a submitted Facility is missing or inactive.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'A room type with the same code already exists.',
  })
  create(@Body() dto: CreateRoomTypeDto): Promise<RoomTypeResponseDto> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a room type',
    description:
      'Update mutable room type fields. The code and Facility assignments are unchanged.',
  })
  @ApiParam({ name: 'id', description: 'Room type identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomTypeResponseDto, {
    description: 'Room type updated successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room type identifier or request body is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room type does not exist.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomTypeDto,
  ): Promise<RoomTypeResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate a room type',
    description: 'Deactivate a room type unless a non-retired Room uses it.',
  })
  @ApiParam({ name: 'id', description: 'Room type identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomTypeResponseDto, {
    description: 'Room type deactivated successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room type identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room type does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'A non-retired Room uses the room type.',
  })
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<RoomTypeResponseDto> {
    return this.service.deactivate(id);
  }

  @Patch(':id/restore')
  @ApiOperation({
    summary: 'Restore a room type',
    description: 'Reactivate a room type when all assigned Facilities are active.',
  })
  @ApiParam({ name: 'id', description: 'Room type identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomTypeResponseDto, {
    description: 'Room type restored successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room type identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room type does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'An assigned Facility is inactive.',
  })
  restore(@Param('id', ParseUUIDPipe) id: string): Promise<RoomTypeResponseDto> {
    return this.service.restore(id);
  }

  @Post(':id/facilities/add')
  @ApiOperation({
    summary: 'Add Facilities to a room type',
    description: 'Atomically add active Facilities. Existing assignments are successful no-ops.',
  })
  @ApiParam({ name: 'id', description: 'Room type identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomTypeResponseDto, {
    description: 'Room type Facility assignments updated successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'Room type identifier or request body is invalid, or a submitted Facility is missing or inactive.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room type does not exist.',
  })
  addFacilities(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RoomTypeFacilityIdsDto,
  ): Promise<RoomTypeResponseDto> {
    return this.service.addFacilities(id, dto);
  }

  @Post(':id/facilities/remove')
  @ApiOperation({
    summary: 'Remove Facilities from a room type',
    description:
      'Atomically remove Facility assignments. Missing or unassigned Facilities are no-ops.',
  })
  @ApiParam({ name: 'id', description: 'Room type identifier.', format: 'uuid' })
  @ApiSuccessResponse(RoomTypeResponseDto, {
    description: 'Room type Facility assignments updated successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room type identifier or request body is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room type does not exist.',
  })
  removeFacilities(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RoomTypeFacilityIdsDto,
  ): Promise<RoomTypeResponseDto> {
    return this.service.removeFacilities(id, dto);
  }
}
