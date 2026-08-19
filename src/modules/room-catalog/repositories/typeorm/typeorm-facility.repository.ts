import { InjectRepository } from '@nestjs/typeorm';
import { Facility } from '../../entities/facility.entity';
import { FacilityRepositoryPort } from '../ports/facility-repository.port';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TypeOrmFacilityRepository implements FacilityRepositoryPort {
  constructor(@InjectRepository(Facility) private readonly repository: Repository<Facility>) {}

  async findById(id: string): Promise<Facility | null> {
    return this.repository.findOneBy({ id });
  }
  async findAll(): Promise<Facility[]> {
    return this.repository.find({
      order: {
        name: 'ASC',
        id: 'ASC',
      },
    });
  }
  async save(facility: Facility): Promise<Facility> {
    return this.repository.save(facility);
  }
}
