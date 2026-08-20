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
import { CreateFacilityDto } from '../dto/facility/create-facility.dto';
import { FacilityResponseDto } from '../dto/facility/facility-response.dto';
import { FacilityService } from '../services/facility.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { FacilityQueryDto } from '../dto/facility/facility-query.dto';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { UpdateFacilityDto } from '../dto/facility/update-facility.dto';
import { ErrorResponseDto } from 'src/common/presentation/http/dto/error-response.dto';

@ApiTags('Room Catalog Management Facilities')
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
@Controller('v1/room-catalog/management/facilities')
export class ManagementFacilityController {
  constructor(private readonly service: FacilityService) {}

  @Get()
  @ApiOperation({
    summary: 'List facilities',
    description: 'Return a paginated management view of facilities, including inactive records.',
  })
  @ApiPaginatedSuccessResponse(FacilityResponseDto, {
    description: 'Facilities retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Facility query parameters are invalid.',
  })
  list(@Query() dto: FacilityQueryDto): Promise<PaginatedResult<FacilityResponseDto>> {
    return this.service.list(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a facility',
    description: 'Return an active or inactive facility by identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'Facility identifier.',
    format: 'uuid',
  })
  @ApiSuccessResponse(FacilityResponseDto, {
    description: 'Facility retrieved successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Facility identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Facility does not exist.',
  })
  findOne(@Param(ParseUUIDPipe) id: string): Promise<FacilityResponseDto> {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a facility',
    description: 'Create an active facility with a case-insensitively unique name.',
  })
  @ApiSuccessResponse(FacilityResponseDto, {
    status: HttpStatus.CREATED,
    description: 'Facility created successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Facility request body is invalid.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'A facility with the same name already exists.',
  })
  create(@Body() dto: CreateFacilityDto): Promise<FacilityResponseDto> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a facility',
    description: 'Update a facility name or description.',
  })
  @ApiParam({
    name: 'id',
    description: 'Facility identifier.',
    format: 'uuid',
  })
  @ApiSuccessResponse(FacilityResponseDto, {
    description: 'Facility updated successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Facility identifier or request body is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Facility does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'A facility with the same name already exists.',
  })
  update(
    @Param(ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacilityDto,
  ): Promise<FacilityResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate a facility',
    description: 'Deactivate a facility unless an active room type uses it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Facility identifier.',
    format: 'uuid',
  })
  @ApiSuccessResponse(FacilityResponseDto, {
    description: 'Facility deactivated successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Facility identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Facility does not exist.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Facility is assigned to an active room type.',
  })
  deactivate(@Param(ParseUUIDPipe) id: string): Promise<FacilityResponseDto> {
    return this.service.deactivate(id);
  }

  @Patch(':id/restore')
  @ApiOperation({
    summary: 'Restore a facility',
    description: 'Reactivate an inactive facility.',
  })
  @ApiParam({
    name: 'id',
    description: 'Facility identifier.',
    format: 'uuid',
  })
  @ApiSuccessResponse(FacilityResponseDto, {
    description: 'Facility restored successfully.',
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Facility identifier is invalid.',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Facility does not exist.',
  })
  restore(@Param(ParseUUIDPipe) id: string): Promise<FacilityResponseDto> {
    return this.service.restore(id);
  }
}
