import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { PRICING_ROOM_TYPE_QUERY } from 'src/modules/room-catalog/contracts/pricing-room-type-query.contract';
import type { PricingRoomTypeQuery } from 'src/modules/room-catalog/contracts/pricing-room-type-query.contract';
import { CreateRoomRateDto } from '../dto/create-room-rate.dto';
import { RoomRateQueryDto } from '../dto/room-rate-query.dto';
import { RoomRateResponseDto } from '../dto/room-rate-response.dto';
import { UpdateRoomRateDto } from '../dto/update-room-rate.dto';
import { RoomRate } from '../entities/room-rate.entity';
import { ROOM_RATE_REPOSITORY } from '../repositories/ports/pricing-repository.token';
import type { RoomRateRepositoryPort } from '../repositories/ports/room-rate-repository.port';
import { HOTEL_LOCAL_CLOCK } from './hotel-local-clock';
import type { HotelLocalClock } from './hotel-local-clock';

@Injectable()
export class RoomRateService {
  constructor(
    @Inject(ROOM_RATE_REPOSITORY) private readonly repository: RoomRateRepositoryPort,
    @Inject(PRICING_ROOM_TYPE_QUERY) private readonly roomTypeQuery: PricingRoomTypeQuery,
    @Inject(HOTEL_LOCAL_CLOCK) private readonly clock: HotelLocalClock,
  ) {}

  async create(dto: CreateRoomRateDto): Promise<RoomRateResponseDto> {
    const currentDate = this.clock.currentDate();

    if (dto.startDate >= dto.endDate || dto.startDate <= currentDate) {
      throw this.invalidRangeException();
    }

    await this.validateActiveRoomType(dto.roomTypeId);

    if (await this.repository.hasOverlap(dto.roomTypeId, dto.startDate, dto.endDate)) {
      throw this.overlapException();
    }

    const roomRate = Object.assign(new RoomRate(), {
      roomTypeId: dto.roomTypeId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      pricePerNight: dto.pricePerNight,
    });

    return this.toResponseDto(await this.repository.save(roomRate));
  }

  async list(dto: RoomRateQueryDto): Promise<PaginatedResult<RoomRateResponseDto>> {
    if (
      (dto.fromDate === undefined) !== (dto.toDate === undefined) ||
      (dto.fromDate !== undefined && dto.toDate !== undefined && dto.fromDate >= dto.toDate)
    ) {
      throw this.invalidRangeException();
    }

    const result = await this.repository.findPage({
      page: dto.page,
      limit: dto.limit,
      roomTypeId: dto.roomTypeId,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
    });

    return new PaginatedResult(
      result.items.map((roomRate) => this.toResponseDto(roomRate)),
      {
        page: dto.page,
        pageSize: dto.limit,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / dto.limit),
      },
    );
  }

  async findOne(id: string): Promise<RoomRateResponseDto> {
    const roomRate = await this.repository.findById(id);

    if (roomRate === null) {
      throw this.notFoundException();
    }

    return this.toResponseDto(roomRate);
  }

  async update(id: string, dto: UpdateRoomRateDto): Promise<RoomRateResponseDto> {
    if (
      dto.startDate === undefined &&
      dto.endDate === undefined &&
      dto.pricePerNight === undefined
    ) {
      throw new BadRequestException({
        message: 'At least one mutable room rate field is required.',
        error: 'INVALID_ROOM_RATE_UPDATE',
      });
    }

    const existing = await this.repository.findById(id);

    if (existing === null) {
      throw this.notFoundException();
    }

    const currentDate = this.clock.currentDate();

    if (existing.startDate <= currentDate) {
      throw this.alreadyStartedException();
    }

    await this.validateActiveRoomType(existing.roomTypeId);

    const startDate = dto.startDate ?? existing.startDate;
    const endDate = dto.endDate ?? existing.endDate;

    if (startDate <= currentDate || startDate >= endDate) {
      throw this.invalidRangeException();
    }

    if (await this.repository.hasOverlap(existing.roomTypeId, startDate, endDate, existing.id)) {
      throw this.overlapException();
    }

    existing.startDate = startDate;
    existing.endDate = endDate;
    existing.pricePerNight = dto.pricePerNight ?? existing.pricePerNight;

    return this.toResponseDto(await this.repository.save(existing));
  }

  async delete(id: string): Promise<void> {
    const roomRate = await this.repository.findById(id);

    if (roomRate === null) {
      throw this.notFoundException();
    }

    if (roomRate.startDate <= this.clock.currentDate()) {
      throw this.alreadyStartedException();
    }

    await this.repository.remove(roomRate);
  }

  private async validateActiveRoomType(roomTypeId: string): Promise<void> {
    const roomType = await this.roomTypeQuery.findById(roomTypeId);

    if (roomType === null) {
      throw new NotFoundException({
        message: 'Room type not found.',
        error: 'ROOM_TYPE_NOT_FOUND',
      });
    }

    if (!roomType.isActive) {
      throw new ConflictException({
        message: 'Room type is inactive.',
        error: 'INACTIVE_ROOM_TYPE',
      });
    }
  }

  private toResponseDto(roomRate: RoomRate): RoomRateResponseDto {
    return {
      id: roomRate.id,
      roomTypeId: roomRate.roomTypeId,
      startDate: roomRate.startDate,
      endDate: roomRate.endDate,
      pricePerNight: roomRate.pricePerNight,
      createdAt: roomRate.createdAt.toISOString(),
      updatedAt: roomRate.updatedAt.toISOString(),
    };
  }

  private notFoundException(): NotFoundException {
    return new NotFoundException({
      message: 'Room rate not found.',
      error: 'ROOM_RATE_NOT_FOUND',
    });
  }

  private overlapException(): ConflictException {
    return new ConflictException({
      message: 'Room rate overlaps an existing range.',
      error: 'ROOM_RATE_OVERLAP',
    });
  }

  private alreadyStartedException(): ConflictException {
    return new ConflictException({
      message: 'Room rate has already started.',
      error: 'ROOM_RATE_ALREADY_STARTED',
    });
  }

  private invalidRangeException(): BadRequestException {
    return new BadRequestException({
      message: 'Room rate range is invalid.',
      error: 'INVALID_ROOM_RATE_RANGE',
    });
  }
}
