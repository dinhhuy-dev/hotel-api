import type { EntityManager } from 'typeorm';

export const BOOKING_ROOM_CATALOG_SERVICE = Symbol('BOOKING_ROOM_CATALOG_SERVICE');

export interface BookingRoomCatalogFacility {
  readonly id: string;
  readonly name: string;
}

export interface BookingAvailabilityRoomType {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly maxOccupancy: number;
  readonly sellableRoomCount: number;
  readonly facilities: readonly BookingRoomCatalogFacility[];
}

export interface FindAvailabilityRoomTypesInput {
  readonly roomTypeIds?: readonly string[];
  readonly lockForUpdate: boolean;
}

export type BookingRoomOperationalStatus =
  'READY' | 'DIRTY' | 'CLEANING' | 'OUT_OF_SERVICE' | 'RETIRED';

export interface BookingAssignmentRoom {
  readonly id: string;
  readonly roomTypeId: string;
  readonly roomNumber: string;
  readonly operationalStatus: BookingRoomOperationalStatus;
}

export interface FindRoomsForAssignmentInput {
  readonly roomIds: readonly string[];
  readonly lockForUpdate: boolean;
}

export interface BookingRoomCatalogService {
  findAvailabilityRoomTypes(
    input: FindAvailabilityRoomTypesInput,
    manager: EntityManager,
  ): Promise<readonly BookingAvailabilityRoomType[]>;
  findRoomsForAssignment(
    input: FindRoomsForAssignmentInput,
    manager: EntityManager,
  ): Promise<readonly BookingAssignmentRoom[]>;
  markRoomsDirty(roomIds: readonly string[], manager: EntityManager): Promise<void>;
}
