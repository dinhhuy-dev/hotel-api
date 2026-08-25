import { RoomRate } from '../../entities/room-rate.entity';

export interface RoomRateListOptions {
  readonly page: number;
  readonly limit: number;
  readonly roomTypeId?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
}

export interface RoomRateListResult {
  readonly items: RoomRate[];
  readonly totalItems: number;
}

export interface RoomRateRepositoryPort {
  save(roomRate: RoomRate): Promise<RoomRate>;
  findPage(options: RoomRateListOptions): Promise<RoomRateListResult>;
  findById(id: string): Promise<RoomRate | null>;
  findOverlappingForRoomTypes(
    roomTypeIds: readonly string[],
    startDate: string,
    endDate: string,
  ): Promise<RoomRate[]>;
  hasOverlap(
    roomTypeId: string,
    startDate: string,
    endDate: string,
    excludedId?: string,
  ): Promise<boolean>;
  remove(roomRate: RoomRate): Promise<void>;
}
