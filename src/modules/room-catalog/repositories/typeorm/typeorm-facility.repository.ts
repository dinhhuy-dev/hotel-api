import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Facility } from '../../entities/facility.entity';
import {
  FacilityDeactivationResult,
  FacilityListOptions,
  FacilityListResult,
  FacilityRepositoryPort,
} from '../ports/facility-repository.port';
import { DataSource, FindOptionsWhere, ILike, Raw, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { RoomTypeFacility } from '../../entities/room-type-facility.entity';

@Injectable()
export class TypeOrmFacilityRepository implements FacilityRepositoryPort {
  constructor(
    @InjectRepository(Facility) private readonly repository: Repository<Facility>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<Facility | null> {
    return this.repository.findOneBy({ id });
  }
  async findAll(options: FacilityListOptions): Promise<FacilityListResult> {
    const where: FindOptionsWhere<Facility> = {
      ...(options.search ? { name: ILike(`%${options.search}%`) } : {}),
      ...(options.isActive !== undefined ? { isActive: options.isActive } : {}),
    };

    const [items, totalItems] = await this.repository.findAndCount({
      where,
      order: {
        name: 'ASC',
        id: 'ASC',
      },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });

    return { items, totalItems };
  }
  async findByNameInsensitive(name: string): Promise<Facility | null> {
    return this.repository.findOne({
      where: {
        name: Raw((columnAlias) => `LOWER(${columnAlias}) = LOWER(:name)`, { name }),
      },
    });
  }
  async save(facility: Facility): Promise<Facility> {
    return this.repository.save(facility);
  }
  async deactivate(id: string): Promise<FacilityDeactivationResult> {
    return this.dataSource.transaction(async (manager) => {
      const facilityRepository = manager.getRepository(Facility);

      const facility = await facilityRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (facility === null) {
        return { kind: 'not-found' };
      }

      const isInUse = await manager
        .getRepository(RoomTypeFacility)
        .createQueryBuilder('roomTypeFacility')
        .innerJoin('roomTypeFacility.roomType', 'roomType')
        .where('roomTypeFacility.facilityId = :facilityId', { facilityId: id })
        .andWhere('roomType.isActive = :isActive', { isActive: true })
        .getExists();

      if (isInUse) {
        return { kind: 'in-use' };
      }

      facility.isActive = false;

      return {
        kind: 'deactivated',
        facility: await facilityRepository.save(facility),
      };
    });
  }
}
