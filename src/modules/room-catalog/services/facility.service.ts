import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FACILITY_REPOSITORY } from '../repositories/ports/room-catalog-repository.token';
import type { FacilityRepositoryPort } from '../repositories/ports/facility-repository.port';
import { CreateFacilityDto } from '../dto/facility/create-facility.dto';
import { FacilityResponseDto } from '../dto/facility/facility-response.dto';
import { Facility } from '../entities/facility.entity';
import { FacilityQueryDto } from '../dto/facility/facility-query.dto';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { UpdateFacilityDto } from '../dto/facility/update-facility.dto';

@Injectable()
export class FacilityService {
  constructor(@Inject(FACILITY_REPOSITORY) private readonly repository: FacilityRepositoryPort) {}

  async create(dto: CreateFacilityDto): Promise<FacilityResponseDto> {
    const existing = await this.repository.findByNameInsensitive(dto.name);

    if (existing) {
      throw new ConflictException({
        message: 'Facility name already exists.',
        error: 'DUPLICATE_FACILITY_NAME',
      });
    }

    const facility = new Facility();
    facility.name = dto.name;
    facility.description = dto.description ?? null;
    facility.isActive = true;

    const saved = await this.repository.save(facility);

    return this.toResponseDto(saved);
  }
  async list(dto: FacilityQueryDto): Promise<PaginatedResult<FacilityResponseDto>> {
    const result = await this.repository.findAll({
      page: dto.page,
      limit: dto.limit,
      search: dto.search ?? undefined,
      isActive: dto.isActive ?? undefined,
    });

    return new PaginatedResult(
      result.items.map((facility) => this.toResponseDto(facility)),
      {
        page: dto.page,
        pageSize: dto.limit,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / dto.limit),
      },
    );
  }
  async findOne(id: string): Promise<FacilityResponseDto> {
    const facility = await this.repository.findById(id);

    if (facility === null) {
      throw new NotFoundException({
        message: 'Facility not found.',
        error: 'FACILITY_NOT_FOUND',
      });
    }

    return this.toResponseDto(facility);
  }
  async update(id: string, dto: UpdateFacilityDto): Promise<FacilityResponseDto> {
    const facility = await this.repository.findById(id);

    if (facility === null) {
      throw new NotFoundException({
        message: 'Facility not found.',
        error: 'FACILITY_NOT_FOUND',
      });
    }

    if (dto.name !== undefined && dto.name !== facility.name) {
      const existing = await this.repository.findByNameInsensitive(dto.name);

      if (existing && existing.id !== facility.id) {
        throw new ConflictException({
          message: 'Facility name already exists.',
          error: 'DUPLICATE_FACILITY_NAME',
        });
      }

      facility.name = dto.name;
    }

    if (dto.description !== undefined) {
      facility.description = dto.description;
    }

    return this.toResponseDto(await this.repository.save(facility));
  }
  async deactivate(id: string): Promise<FacilityResponseDto> {
    const result = await this.repository.deactivate(id);

    if (result.kind === 'not-found') {
      throw new NotFoundException({
        message: 'Facility not found.',
        error: 'FACILITY_NOT_FOUND',
      });
    }

    if (result.kind === 'in-use') {
      throw new ConflictException({
        message: 'Facility is assigned to an active room type.',
        error: 'FACILITY_IN_USE',
      });
    }

    return this.toResponseDto(result.facility);
  }
  async restore(id: string): Promise<FacilityResponseDto> {
    const facility = await this.repository.findById(id);

    if (facility === null) {
      throw new NotFoundException({
        message: 'Facility not found.',
        error: 'FACILITY_NOT_FOUND',
      });
    }

    if (facility.isActive) {
      return this.toResponseDto(facility);
    }

    facility.isActive = true;

    return this.toResponseDto(await this.repository.save(facility));
  }
  private toResponseDto(entity: Facility): FacilityResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
