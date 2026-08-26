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
import { RoomQueryDto } from '../dto/room/room-query.dto';
import { StaffRoomResponseDto } from '../dto/room/room-response.dto';
import { RoomService } from '../services/room.service';

@ApiTags('Room Catalog Staff Rooms')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponseDto,
  description: 'Access token is missing or invalid.',
})
@ApiForbiddenResponse({
  type: ErrorResponseDto,
  description: 'A staff role is required.',
})
@Roles(
  AccountRole.ADMINISTRATOR,
  AccountRole.HOTEL_MANAGER,
  AccountRole.RECEPTIONIST,
  AccountRole.HOUSEKEEPING_STAFF,
  AccountRole.MAINTENANCE_STAFF,
)
@Controller('v1/room-catalog/rooms')
export class StaffRoomController {
  constructor(private readonly service: RoomService) {}

  @Get()
  @ApiOperation({
    summary: 'List non-retired rooms',
    description: 'Return a paginated staff view of rooms that are not retired.',
  })
  @ApiPaginatedSuccessResponse(StaffRoomResponseDto, {
    description: 'Non-retired rooms retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room query parameters are invalid.',
  })
  list(@Query() dto: RoomQueryDto): Promise<PaginatedResult<StaffRoomResponseDto>> {
    return this.service.listForStaff(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a non-retired room',
    description: 'Return a non-retired room by identifier.',
  })
  @ApiParam({ name: 'id', description: 'Room identifier.', format: 'uuid' })
  @ApiSuccessResponse(StaffRoomResponseDto, {
    description: 'Non-retired room retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room does not exist or is retired.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StaffRoomResponseDto> {
    return this.service.findOneForStaff(id);
  }
}
