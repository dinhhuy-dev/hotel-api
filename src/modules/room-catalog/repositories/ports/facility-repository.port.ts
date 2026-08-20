import { Facility } from '../../entities/facility.entity';

export interface FacilityListOptions {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly isActive?: boolean;
}

export interface FacilityListResult {
  readonly items: Facility[];
  readonly totalItems: number;
}

export type FacilityDeactivationResult =
  | { readonly kind: 'not-found' }
  | { readonly kind: 'in-use' }
  | { readonly kind: 'deactivated'; readonly facility: Facility };

export interface FacilityRepositoryPort {
  findById(id: string): Promise<Facility | null>;
  findAll(options: FacilityListOptions): Promise<FacilityListResult>;
  findByNameInsensitive(name: string): Promise<Facility | null>;
  save(facility: Facility): Promise<Facility>;
  deactivate(id: string): Promise<FacilityDeactivationResult>;
}
