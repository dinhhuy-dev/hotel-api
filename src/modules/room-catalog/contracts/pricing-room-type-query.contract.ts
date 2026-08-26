export const PRICING_ROOM_TYPE_QUERY = Symbol('PRICING_ROOM_TYPE_QUERY');

export interface PricingRoomTypeRecord {
  readonly id: string;
  readonly isActive: boolean;
}

export interface PricingRoomTypeQuery {
  findById(roomTypeId: string): Promise<PricingRoomTypeRecord | null>;
}
