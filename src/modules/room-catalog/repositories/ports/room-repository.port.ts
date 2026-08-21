import { OperationalStatus } from '../../entities/enum/operational-status';
import { Facility } from '../../entities/facility.entity';
import { RoomType } from '../../entities/room-type.entity';
import { Room } from '../../entities/room.entity';

export interface RoomListOptions {
  readonly page: number;
  readonly limit: number;
  readonly search?: string;
  readonly roomTypeId?: string;
  readonly floor?: string;
  readonly operationalStatus?: OperationalStatus;
}

export interface RoomWithDetails {
  readonly room: Room;
  readonly roomType: RoomType;
  readonly facilities: Facility[];
}

export interface RoomListResult {
  readonly items: RoomWithDetails[];
  readonly totalItems: number;
}

export interface UpdateRoomInput {
  readonly roomNumber?: string | null;
  readonly floor?: string | null;
  readonly roomTypeId?: string | null;
}

export type CreateRoomResult =
  | { readonly kind: 'created'; readonly details: RoomWithDetails }
  | { readonly kind: 'duplicate-room-number' }
  | { readonly kind: 'room-type-not-found' }
  | { readonly kind: 'inactive-room-type' };

export type UpdateRoomResult =
  | { readonly kind: 'updated'; readonly details: RoomWithDetails }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'invalid-input' }
  | { readonly kind: 'duplicate-room-number' }
  | { readonly kind: 'room-retired' }
  | { readonly kind: 'room-type-change-not-allowed' }
  | { readonly kind: 'room-type-not-found' }
  | { readonly kind: 'inactive-room-type' };

export type UpdateRoomStatusResult =
  | { readonly kind: 'updated'; readonly details: RoomWithDetails }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'invalid-transition' };

export type RetireRoomResult =
  { readonly kind: 'retired'; readonly details: RoomWithDetails } | { readonly kind: 'not-found' };

export type RestoreRoomResult =
  | { readonly kind: 'restored'; readonly details: RoomWithDetails }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'room-not-retired' }
  | { readonly kind: 'room-type-not-found' }
  | { readonly kind: 'inactive-room-type' };

export interface RoomRepositoryPort {
  findByRoomNumber(roomNumber: string): Promise<Room | null>;
  findAllWithDetails(options: RoomListOptions): Promise<RoomListResult>;
  findAllNonRetiredWithDetails(options: RoomListOptions): Promise<RoomListResult>;
  findWithDetailsById(id: string): Promise<RoomWithDetails | null>;
  create(room: Room): Promise<CreateRoomResult>;
  update(id: string, input: UpdateRoomInput): Promise<UpdateRoomResult>;
  updateStatus(id: string, status: OperationalStatus): Promise<UpdateRoomStatusResult>;
  retire(id: string): Promise<RetireRoomResult>;
  restore(id: string): Promise<RestoreRoomResult>;
}
