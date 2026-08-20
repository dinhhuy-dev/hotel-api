import { Facility } from '../../entities/facility.entity';
import { RoomType } from '../../entities/room-type.entity';

export interface CreateRoomTypeInput {
  readonly roomType: RoomType;
  readonly facilityIds: readonly string[];
}

export type CreateRoomTypeResult =
  | { readonly kind: 'duplicate-code' }
  | {
      readonly kind: 'invalid-facilities';
      readonly missingFacilityIds: string[];
      readonly inactiveFacilityIds: string[];
    }
  | {
      readonly kind: 'created';
      readonly roomType: RoomType;
      readonly facilities: Facility[];
    };

export interface RoomTypeWithFacilities {
  readonly roomType: RoomType;
  readonly facilities: Facility[];
}

export interface RoomTypeListOptions {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly isActive?: boolean;
}

export interface RoomTypeListResult {
  readonly items: RoomTypeWithFacilities[];
  readonly totalItems: number;
}

export interface PublicRoomTypeListOptions {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
}

export interface PublicRoomTypeListResult {
  readonly items: RoomType[];
  readonly totalItems: number;
}

export type RoomTypeDeactivationResult =
  | { readonly kind: 'not-found' }
  | { readonly kind: 'in-use' }
  | {
      readonly kind: 'deactivated';
      readonly roomType: RoomType;
      readonly facilities: Facility[];
    };

export type RoomTypeRestoreResult =
  | { readonly kind: 'not-found' }
  | {
      readonly kind: 'inactive-facilities';
      readonly inactiveFacilityIds: string[];
    }
  | {
      readonly kind: 'restored';
      readonly roomType: RoomType;
      readonly facilities: Facility[];
    };

export interface ChangeRoomTypeFacilitiesInput {
  readonly roomTypeId: string;
  readonly facilityIds: readonly string[];
}

export type AddRoomTypeFacilitiesResult =
  | { readonly kind: 'not-found' }
  | {
      readonly kind: 'invalid-facilities';
      readonly missingFacilityIds: string[];
      readonly inactiveFacilityIds: string[];
    }
  | {
      readonly kind: 'changed';
      readonly roomType: RoomType;
      readonly facilities: Facility[];
    };

export type RemoveRoomTypeFacilitiesResult =
  | { readonly kind: 'not-found' }
  | {
      readonly kind: 'changed';
      readonly roomType: RoomType;
      readonly facilities: Facility[];
    };

export interface RoomTypeRepositoryPort {
  findById(id: string): Promise<RoomType | null>;
  findAll(): Promise<RoomType[]>;
  findAllWithFacilities(options: RoomTypeListOptions): Promise<RoomTypeListResult>;
  findWithFacilitiesById(id: string): Promise<RoomTypeWithFacilities | null>;
  findActivePage(options: PublicRoomTypeListOptions): Promise<PublicRoomTypeListResult>;
  findActiveWithActiveFacilitiesById(id: string): Promise<RoomTypeWithFacilities | null>;
  save(roomType: RoomType): Promise<RoomType>;
  createWithFacilities(input: CreateRoomTypeInput): Promise<CreateRoomTypeResult>;
  deactivate(id: string): Promise<RoomTypeDeactivationResult>;
  restore(id: string): Promise<RoomTypeRestoreResult>;
  addFacilities(input: ChangeRoomTypeFacilitiesInput): Promise<AddRoomTypeFacilitiesResult>;
  removeFacilities(input: ChangeRoomTypeFacilitiesInput): Promise<RemoveRoomTypeFacilitiesResult>;
}
