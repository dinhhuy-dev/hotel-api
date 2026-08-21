import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ROOM_TYPE_REPOSITORY } from '../repositories/ports/room-catalog-repository.token';
import type { RoomTypeRepositoryPort } from '../repositories/ports/room-type-repository.port';
import { CreateRoomTypeDto } from '../dto/room-type/create-room-type.dto';
import { RoomTypeResponseDto } from '../dto/room-type/room-type-response.dto';
import { Facility } from '../entities/facility.entity';
import { RoomType } from '../entities/room-type.entity';
import { FacilityResponseDto } from '../dto/facility/facility-response.dto';
import { RoomTypeQueryDto } from '../dto/room-type/room-type-query.dto';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { UpdateRoomTypeDto } from '../dto/room-type/update-room-type.dto';
import { RoomTypeFacilityIdsDto } from '../dto/room-type/room-type-facility-ids.dto';
import { PublicRoomTypeQueryDto } from '../dto/room-type/public-room-type-query.dto';
import {
  PublicFacilityResponseDto,
  PublicRoomTypeDetailDto,
  PublicRoomTypeListItemDto,
} from '../dto/room-type/public-room-type-response.dto';

@Injectable()
export class RoomTypeService {
  constructor(@Inject(ROOM_TYPE_REPOSITORY) private readonly repository: RoomTypeRepositoryPort) {}

  async create(dto: CreateRoomTypeDto): Promise<RoomTypeResponseDto> {
    const roomType = new RoomType();
    roomType.code = dto.code;
    roomType.name = dto.name;
    roomType.description = dto.description ?? null;
    roomType.maxOccupancy = dto.maxOccupancy;
    roomType.bedConfiguration = dto.bedConfiguration ?? null;
    roomType.displayOrder = dto.displayOrder;
    roomType.isActive = true;

    const result = await this.repository.createWithFacilities({
      roomType,
      facilityIds: dto.facilityIds ?? [],
    });

    switch (result.kind) {
      case 'duplicate-code':
        throw new ConflictException({
          message: 'Room type code already exists.',
          error: 'DUPLICATE_ROOM_TYPE_CODE',
        });

      case 'invalid-facilities':
        throw new BadRequestException({
          message: this.toInvalidFacilityMessages(
            result.missingFacilityIds,
            result.inactiveFacilityIds,
          ),
          error: 'INVALID_FACILITIES',
        });

      case 'created':
        return this.toResponseDto(result.roomType, result.facilities);
    }
  }

  async list(dto: RoomTypeQueryDto): Promise<PaginatedResult<RoomTypeResponseDto>> {
    const result = await this.repository.findAllWithFacilities({
      page: dto.page,
      limit: dto.limit,
      search: dto.search ?? undefined,
      isActive: dto.isActive ?? undefined,
    });

    return new PaginatedResult(
      result.items.map(({ roomType, facilities }) => this.toResponseDto(roomType, facilities)),
      {
        page: dto.page,
        pageSize: dto.limit,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / dto.limit),
      },
    );
  }

  async findOne(id: string): Promise<RoomTypeResponseDto> {
    const result = await this.repository.findWithFacilitiesById(id);

    if (result === null) {
      throw new NotFoundException({
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      });
    }

    return this.toResponseDto(result.roomType, result.facilities);
  }

  async listPublic(
    dto: PublicRoomTypeQueryDto,
  ): Promise<PaginatedResult<PublicRoomTypeListItemDto>> {
    const result = await this.repository.findActivePage({
      page: dto.page,
      limit: dto.limit,
      search: dto.search ?? undefined,
    });

    return new PaginatedResult(
      result.items.map((roomType) => this.toPublicListItemDto(roomType)),
      {
        page: dto.page,
        pageSize: dto.limit,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / dto.limit),
      },
    );
  }

  async findPublicOne(id: string): Promise<PublicRoomTypeDetailDto> {
    const result = await this.repository.findActiveWithActiveFacilitiesById(id);

    if (result === null) {
      throw new NotFoundException({
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      });
    }

    return {
      ...this.toPublicListItemDto(result.roomType),
      description: result.roomType.description,
      facilities: result.facilities.map((facility) => this.toPublicFacilityResponseDto(facility)),
    };
  }

  async update(id: string, dto: UpdateRoomTypeDto): Promise<RoomTypeResponseDto> {
    const result = await this.repository.findWithFacilitiesById(id);

    if (result === null) {
      throw new NotFoundException({
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      });
    }

    const { roomType, facilities } = result;

    if (dto.name !== undefined) {
      roomType.name = dto.name;
    }

    if (dto.description !== undefined) {
      roomType.description = dto.description;
    }

    if (dto.maxOccupancy !== undefined) {
      roomType.maxOccupancy = dto.maxOccupancy;
    }

    if (dto.bedConfiguration !== undefined) {
      roomType.bedConfiguration = dto.bedConfiguration;
    }

    if (dto.displayOrder !== undefined) {
      roomType.displayOrder = dto.displayOrder;
    }

    const savedRoomType = await this.repository.save(roomType);

    return this.toResponseDto(savedRoomType, facilities);
  }

  async deactivate(id: string): Promise<RoomTypeResponseDto> {
    const result = await this.repository.deactivate(id);

    switch (result.kind) {
      case 'not-found':
        throw new NotFoundException({
          message: 'Room type not found.',
          error: 'ROOM_TYPE_NOT_FOUND',
        });

      case 'in-use':
        throw new ConflictException({
          message: 'Room type is assigned to a non-retired room.',
          error: 'ROOM_TYPE_IN_USE',
        });

      case 'deactivated':
        return this.toResponseDto(result.roomType, result.facilities);
    }
  }

  async restore(id: string): Promise<RoomTypeResponseDto> {
    const result = await this.repository.restore(id);

    switch (result.kind) {
      case 'not-found':
        throw new NotFoundException({
          message: 'Room type not found.',
          error: 'ROOM_TYPE_NOT_FOUND',
        });

      case 'inactive-facilities':
        throw new ConflictException({
          message: `Inactive facilities: ${result.inactiveFacilityIds.join(', ')}.`,
          error: 'INACTIVE_FACILITY',
        });

      case 'restored':
        return this.toResponseDto(result.roomType, result.facilities);
    }
  }

  async addFacilities(id: string, dto: RoomTypeFacilityIdsDto): Promise<RoomTypeResponseDto> {
    const result = await this.repository.addFacilities({
      roomTypeId: id,
      facilityIds: dto.facilityIds,
    });

    switch (result.kind) {
      case 'not-found':
        throw new NotFoundException({
          message: 'Room type not found.',
          error: 'ROOM_TYPE_NOT_FOUND',
        });

      case 'invalid-facilities':
        throw new BadRequestException({
          message: this.toInvalidFacilityMessages(
            result.missingFacilityIds,
            result.inactiveFacilityIds,
          ),
          error: 'INVALID_FACILITIES',
        });

      case 'changed':
        return this.toResponseDto(result.roomType, result.facilities);
    }
  }

  async removeFacilities(id: string, dto: RoomTypeFacilityIdsDto): Promise<RoomTypeResponseDto> {
    const result = await this.repository.removeFacilities({
      roomTypeId: id,
      facilityIds: dto.facilityIds,
    });

    switch (result.kind) {
      case 'not-found':
        throw new NotFoundException({
          message: 'Room type not found.',
          error: 'ROOM_TYPE_NOT_FOUND',
        });

      case 'changed':
        return this.toResponseDto(result.roomType, result.facilities);
    }
  }

  private toResponseDto(roomType: RoomType, facilities: Facility[]): RoomTypeResponseDto {
    return {
      id: roomType.id,
      code: roomType.code,
      name: roomType.name,
      description: roomType.description,
      maxOccupancy: roomType.maxOccupancy,
      bedConfiguration: roomType.bedConfiguration,
      displayOrder: roomType.displayOrder,
      isActive: roomType.isActive,
      createdAt: roomType.createdAt.toISOString(),
      updatedAt: roomType.updatedAt.toISOString(),
      facilities: facilities.map((facility) => this.toFacilityResponseDto(facility)),
    };
  }

  private toFacilityResponseDto(facility: Facility): FacilityResponseDto {
    return {
      id: facility.id,
      name: facility.name,
      description: facility.description,
      isActive: facility.isActive,
      createdAt: facility.createdAt.toISOString(),
      updatedAt: facility.updatedAt.toISOString(),
    };
  }

  private toPublicListItemDto(roomType: RoomType): PublicRoomTypeListItemDto {
    return {
      id: roomType.id,
      code: roomType.code,
      name: roomType.name,
      maxOccupancy: roomType.maxOccupancy,
      bedConfiguration: roomType.bedConfiguration,
      displayOrder: roomType.displayOrder,
    };
  }

  private toPublicFacilityResponseDto(facility: Facility): PublicFacilityResponseDto {
    return {
      id: facility.id,
      name: facility.name,
      description: facility.description,
    };
  }

  private toInvalidFacilityMessages(
    missingFacilityIds: string[],
    inactiveFacilityIds: string[],
  ): string[] {
    const messages: string[] = [];

    if (missingFacilityIds.length > 0) {
      messages.push(`Facilities not found: ${missingFacilityIds.join(', ')}.`);
    }

    if (inactiveFacilityIds.length > 0) {
      messages.push(`Inactive facilities: ${inactiveFacilityIds.join(', ')}.`);
    }

    return messages;
  }
}
