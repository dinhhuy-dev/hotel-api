import { Facility } from '../../entities/facility.entity';

export interface FacilityRepositoryPort {
  findById(id: string): Promise<Facility | null>;
  findAll(): Promise<Facility[]>;
  save(facility: Facility): Promise<Facility>;
}
