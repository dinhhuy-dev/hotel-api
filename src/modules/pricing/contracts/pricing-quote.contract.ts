import type { BulkRoomTypeQuoteRequestDto } from '../dto/bulk-room-type-quote-request.dto';
import type { EntityManager } from 'typeorm';

export const PRICING_QUOTE_SERVICE = Symbol('PRICING_QUOTE_SERVICE');

export interface AppliedRoomRate {
  readonly roomRateId: string;
  readonly rateStartDate: string;
  readonly rateEndDate: string;
  readonly appliedStartDate: string;
  readonly appliedEndDate: string;
  readonly pricePerNight: number;
  readonly nightCount: number;
  readonly subtotal: number;
}

export interface RoomTypeStayQuote {
  readonly roomTypeId: string;
  readonly pricePerRoomStay: number;
  readonly appliedRates: readonly AppliedRoomRate[];
}

export interface BulkRoomTypeQuoteResult {
  readonly quotes: readonly RoomTypeStayQuote[];
  readonly unquotedRoomTypeIds: readonly string[];
}

export interface PricingQuoteContract {
  quote(
    request: BulkRoomTypeQuoteRequestDto,
    manager?: EntityManager,
  ): Promise<BulkRoomTypeQuoteResult>;
}
