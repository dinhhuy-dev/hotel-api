import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiPaginatedSuccessResponse,
  ApiSuccessResponse,
} from 'src/common/decorators/api-success-response.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { ErrorResponseDto } from 'src/common/presentation/http/dto/error-response.dto';
import { PublicRoomTypeQueryDto } from '../dto/room-type/public-room-type-query.dto';
import {
  PublicRoomTypeDetailDto,
  PublicRoomTypeListItemDto,
} from '../dto/room-type/public-room-type-response.dto';
import { RoomTypeService } from '../services/room-type.service';

@ApiTags('Room Catalog Public Room Types')
@Public()
@Controller('v1/room-catalog/room-types')
export class PublicRoomTypeController {
  constructor(private readonly service: RoomTypeService) {}

  @Get()
  @ApiOperation({
    summary: 'List active room types',
    description: 'Return a paginated public view of active room types.',
  })
  @ApiPaginatedSuccessResponse(PublicRoomTypeListItemDto, {
    description: 'Active room types retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Public room type query parameters are invalid.',
  })
  list(@Query() dto: PublicRoomTypeQueryDto): Promise<PaginatedResult<PublicRoomTypeListItemDto>> {
    return this.service.listPublic(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an active room type',
    description: 'Return an active room type and its active assigned Facilities.',
  })
  @ApiParam({ name: 'id', description: 'Room type identifier.', format: 'uuid' })
  @ApiSuccessResponse(PublicRoomTypeDetailDto, {
    description: 'Active room type retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Room type identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Room type does not exist or is inactive.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PublicRoomTypeDetailDto> {
    return this.service.findPublicOne(id);
  }
}
