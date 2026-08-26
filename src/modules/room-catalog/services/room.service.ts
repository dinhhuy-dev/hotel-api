import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { FacilityResponseDto } from '../dto/facility/facility-response.dto';
import { CreateRoomDto } from '../dto/room/create-room.dto';
import { RoomQueryDto } from '../dto/room/room-query.dto';
import {
  RoomResponseDto,
  RoomTypeSummaryDto,
  StaffRoomResponseDto,
} from '../dto/room/room-response.dto';
import { UpdateRoomStatusDto } from '../dto/room/update-room-status.dto';
import { UpdateRoomDto } from '../dto/room/update-room.dto';
import { PublicFacilityResponseDto } from '../dto/room-type/public-room-type-response.dto';
import { RoomTypeResponseDto } from '../dto/room-type/room-type-response.dto';
import { OperationalStatus } from '../entities/enum/operational-status';
import { Facility } from '../entities/facility.entity';
import { RoomType } from '../entities/room-type.entity';
import { Room } from '../entities/room.entity';
import { ROOM_REPOSITORY } from '../repositories/ports/room-catalog-repository.token';
import type {
  RoomRepositoryPort,
  RoomWithDetails,
  UpdateRoomInput,
} from '../repositories/ports/room-repository.port';

@Injectable()
export class RoomService {
  constructor(@Inject(ROOM_REPOSITORY) private readonly repository: RoomRepositoryPort) {}

  async create(dto: CreateRoomDto): Promise<RoomResponseDto> {
    const existing = await this.repository.findByRoomNumber(dto.roomNumber);

    if (existing !== null) {
      throw this.duplicateRoomNumber();
    }

    const room = new Room();
    room.roomNumber = dto.roomNumber;
    room.floor = dto.floor;
    room.roomTypeId = dto.roomTypeId;
    room.operationalStatus = OperationalStatus.OutOfService;

    const result = await this.repository.create(room);

    switch (result.kind) {
      case 'created':
        return this.toManagementResponseDto(result.details);

      case 'duplicate-room-number':
        throw this.duplicateRoomNumber();

      case 'room-type-not-found':
        throw this.roomTypeNotFound();

      case 'inactive-room-type':
        throw this.inactiveRoomType();
    }
  }

  async list(dto: RoomQueryDto): Promise<PaginatedResult<RoomResponseDto>> {
    const result = await this.repository.findAllWithDetails({
      page: dto.page,
      limit: dto.limit,
      search: dto.search ?? undefined,
      roomTypeId: dto.roomTypeId ?? undefined,
      floor: dto.floor ?? undefined,
      operationalStatus: dto.operationalStatus ?? undefined,
    });

    return this.toPaginatedResult(
      result.items.map((details) => this.toManagementResponseDto(details)),
      dto.page,
      dto.limit,
      result.totalItems,
    );
  }

  async findOne(id: string): Promise<RoomResponseDto> {
    const details = await this.repository.findWithDetailsById(id);

    if (details === null) {
      throw this.roomNotFound();
    }

    return this.toManagementResponseDto(details);
  }

  async update(id: string, dto: UpdateRoomDto): Promise<RoomResponseDto> {
    if (dto.roomNumber === null || dto.floor === null || dto.roomTypeId === null) {
      throw this.invalidRoomUpdate();
    }

    if (dto.roomNumber !== undefined) {
      const existing = await this.repository.findByRoomNumber(dto.roomNumber);

      if (existing !== null && existing.id !== id) {
        throw this.duplicateRoomNumber();
      }
    }

    const input: UpdateRoomInput = {
      ...(dto.roomNumber !== undefined ? { roomNumber: dto.roomNumber } : {}),
      ...(dto.floor !== undefined ? { floor: dto.floor } : {}),
      ...(dto.roomTypeId !== undefined ? { roomTypeId: dto.roomTypeId } : {}),
    };
    const result = await this.repository.update(id, input);

    switch (result.kind) {
      case 'updated':
        return this.toManagementResponseDto(result.details);

      case 'not-found':
        throw this.roomNotFound();

      case 'invalid-input':
        throw this.invalidRoomUpdate();

      case 'duplicate-room-number':
        throw this.duplicateRoomNumber();

      case 'room-retired':
        throw new ConflictException({
          message: 'Retired rooms cannot be updated.',
          error: 'ROOM_RETIRED',
        });

      case 'room-type-change-not-allowed':
        throw new ConflictException({
          message: 'Room type can only be changed while the room is out of service.',
          error: 'ROOM_TYPE_CHANGE_NOT_ALLOWED',
        });

      case 'room-type-not-found':
        throw this.roomTypeNotFound();

      case 'inactive-room-type':
        throw this.inactiveRoomType();
    }
  }

  async updateStatus(id: string, dto: UpdateRoomStatusDto): Promise<RoomResponseDto> {
    if (dto.operationalStatus === OperationalStatus.Retired) {
      throw this.invalidStatusTransition();
    }

    const result = await this.repository.updateStatus(id, dto.operationalStatus);

    switch (result.kind) {
      case 'updated':
        return this.toManagementResponseDto(result.details);

      case 'not-found':
        throw this.roomNotFound();

      case 'invalid-transition':
        throw this.invalidStatusTransition();
    }
  }

  async retire(id: string): Promise<RoomResponseDto> {
    const result = await this.repository.retire(id);

    if (result.kind === 'not-found') {
      throw this.roomNotFound();
    }

    return this.toManagementResponseDto(result.details);
  }

  async restore(id: string): Promise<RoomResponseDto> {
    const result = await this.repository.restore(id);

    switch (result.kind) {
      case 'restored':
        return this.toManagementResponseDto(result.details);

      case 'not-found':
        throw this.roomNotFound();

      case 'room-not-retired':
        throw new ConflictException({
          message: 'Room is not retired.',
          error: 'ROOM_NOT_RETIRED',
        });

      case 'room-type-not-found':
        throw this.roomTypeNotFound();

      case 'inactive-room-type':
        throw this.inactiveRoomType();
    }
  }

  async listForStaff(dto: RoomQueryDto): Promise<PaginatedResult<StaffRoomResponseDto>> {
    const result = await this.repository.findAllNonRetiredWithDetails({
      page: dto.page,
      limit: dto.limit,
      search: dto.search ?? undefined,
      roomTypeId: dto.roomTypeId ?? undefined,
      floor: dto.floor ?? undefined,
      operationalStatus: dto.operationalStatus ?? undefined,
    });

    return this.toPaginatedResult(
      result.items.map((details) => this.toStaffResponseDto(details)),
      dto.page,
      dto.limit,
      result.totalItems,
    );
  }

  async findOneForStaff(id: string): Promise<StaffRoomResponseDto> {
    const details = await this.repository.findWithDetailsById(id);

    if (details === null || details.room.operationalStatus === OperationalStatus.Retired) {
      throw this.roomNotFound();
    }

    return this.toStaffResponseDto(details);
  }

  private toPaginatedResult<T>(
    items: T[],
    page: number,
    limit: number,
    totalItems: number,
  ): PaginatedResult<T> {
    return new PaginatedResult(items, {
      page,
      pageSize: limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    });
  }

  private toManagementResponseDto(details: RoomWithDetails): RoomResponseDto {
    const { room, roomType, facilities } = details;

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      operationalStatus: room.operationalStatus,
      roomType: this.toRoomTypeResponseDto(roomType, facilities),
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    };
  }

  private toStaffResponseDto(details: RoomWithDetails): StaffRoomResponseDto {
    const { room, roomType, facilities } = details;

    return {
      id: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      operationalStatus: room.operationalStatus,
      roomType: this.toRoomTypeSummaryDto(roomType, facilities),
    };
  }

  private toRoomTypeResponseDto(roomType: RoomType, facilities: Facility[]): RoomTypeResponseDto {
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

  private toRoomTypeSummaryDto(roomType: RoomType, facilities: Facility[]): RoomTypeSummaryDto {
    return {
      id: roomType.id,
      code: roomType.code,
      name: roomType.name,
      maxOccupancy: roomType.maxOccupancy,
      bedConfiguration: roomType.bedConfiguration,
      facilities: facilities.map((facility) => this.toPublicFacilityResponseDto(facility)),
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

  private toPublicFacilityResponseDto(facility: Facility): PublicFacilityResponseDto {
    return {
      id: facility.id,
      name: facility.name,
      description: facility.description,
    };
  }

  private roomNotFound(): NotFoundException {
    return new NotFoundException({
      message: 'Room not found.',
      error: 'ROOM_NOT_FOUND',
    });
  }

  private roomTypeNotFound(): NotFoundException {
    return new NotFoundException({
      message: 'Room type not found.',
      error: 'ROOM_TYPE_NOT_FOUND',
    });
  }

  private duplicateRoomNumber(): ConflictException {
    return new ConflictException({
      message: 'Room number already exists.',
      error: 'DUPLICATE_ROOM_NUMBER',
    });
  }

  private inactiveRoomType(): ConflictException {
    return new ConflictException({
      message: 'Room type is inactive.',
      error: 'INACTIVE_ROOM_TYPE',
    });
  }

  private invalidStatusTransition(): UnprocessableEntityException {
    return new UnprocessableEntityException({
      message: 'Invalid room operational status transition.',
      error: 'INVALID_ROOM_STATUS_TRANSITION',
    });
  }

  private invalidRoomUpdate(): BadRequestException {
    return new BadRequestException({
      message: 'Room update fields cannot be null.',
      error: 'INVALID_ROOM_UPDATE',
    });
  }
}
