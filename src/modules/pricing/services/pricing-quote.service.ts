import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { validateSync } from 'class-validator';
import type {
  AppliedRoomRate,
  BulkRoomTypeQuoteResult,
  PricingQuoteContract,
  RoomTypeStayQuote,
} from '../contracts/pricing-quote.contract';
import { BulkRoomTypeQuoteRequestDto } from '../dto/bulk-room-type-quote-request.dto';
import type { RoomRate } from '../entities/room-rate.entity';
import { ROOM_RATE_REPOSITORY } from '../repositories/ports/pricing-repository.token';
import type { RoomRateRepositoryPort } from '../repositories/ports/room-rate-repository.port';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class PricingQuoteService implements PricingQuoteContract {
  constructor(
    @Inject(ROOM_RATE_REPOSITORY)
    private readonly repository: Pick<RoomRateRepositoryPort, 'findOverlappingForRoomTypes'>,
  ) {}

  async quote(request: BulkRoomTypeQuoteRequestDto): Promise<BulkRoomTypeQuoteResult> {
    this.validateRequestFields(request);

    if (request.checkInDate >= request.checkOutDate) {
      throw this.invalidQuoteRangeException();
    }

    const roomRates = await this.repository.findOverlappingForRoomTypes(
      request.roomTypeIds,
      request.checkInDate,
      request.checkOutDate,
    );
    const ratesByRoomType = this.groupRatesByRoomType(roomRates);
    const quotes: RoomTypeStayQuote[] = [];
    const unquotedRoomTypeIds: string[] = [];

    for (const roomTypeId of request.roomTypeIds) {
      const quote = this.buildCompleteQuote(
        roomTypeId,
        ratesByRoomType.get(roomTypeId) ?? [],
        request.checkInDate,
        request.checkOutDate,
      );

      if (quote === null) {
        unquotedRoomTypeIds.push(roomTypeId);
      } else {
        quotes.push(quote);
      }
    }

    return { quotes, unquotedRoomTypeIds };
  }

  private validateRequestFields(request: BulkRoomTypeQuoteRequestDto): void {
    const dto = Object.assign(new BulkRoomTypeQuoteRequestDto(), request);

    if (validateSync(dto).length > 0) {
      throw new BadRequestException({
        message: 'Quote request fields are invalid.',
        error: 'INVALID_QUOTE_REQUEST',
      });
    }
  }

  private groupRatesByRoomType(roomRates: readonly RoomRate[]): Map<string, RoomRate[]> {
    const ratesByRoomType = new Map<string, RoomRate[]>();

    for (const roomRate of roomRates) {
      const rates = ratesByRoomType.get(roomRate.roomTypeId) ?? [];
      rates.push(roomRate);
      ratesByRoomType.set(roomRate.roomTypeId, rates);
    }

    for (const rates of ratesByRoomType.values()) {
      rates.sort(
        (left, right) =>
          left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id),
      );
    }

    return ratesByRoomType;
  }

  private buildCompleteQuote(
    roomTypeId: string,
    roomRates: readonly RoomRate[],
    checkInDate: string,
    checkOutDate: string,
  ): RoomTypeStayQuote | null {
    const appliedRates: AppliedRoomRate[] = [];
    let coveredThrough = checkInDate;
    let pricePerRoomStay = 0;

    for (const roomRate of roomRates) {
      const appliedStartDate = this.latestDate(roomRate.startDate, checkInDate);
      const appliedEndDate = this.earliestDate(roomRate.endDate, checkOutDate);

      if (appliedStartDate >= appliedEndDate) {
        continue;
      }

      if (appliedStartDate !== coveredThrough) {
        return null;
      }

      const nightCount = this.countNights(appliedStartDate, appliedEndDate);
      const subtotal = roomRate.pricePerNight * nightCount;
      const nextTotal = pricePerRoomStay + subtotal;

      if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(nextTotal)) {
        throw this.invalidQuoteRangeException();
      }

      appliedRates.push({
        roomRateId: roomRate.id,
        rateStartDate: roomRate.startDate,
        rateEndDate: roomRate.endDate,
        appliedStartDate,
        appliedEndDate,
        pricePerNight: roomRate.pricePerNight,
        nightCount,
        subtotal,
      });
      coveredThrough = appliedEndDate;
      pricePerRoomStay = nextTotal;
    }

    if (coveredThrough !== checkOutDate) {
      return null;
    }

    return { roomTypeId, pricePerRoomStay, appliedRates };
  }

  private countNights(startDate: string, endDate: string): number {
    return (this.toUtcTimestamp(endDate) - this.toUtcTimestamp(startDate)) / MILLISECONDS_PER_DAY;
  }

  private toUtcTimestamp(date: string): number {
    return Date.parse(`${date}T00:00:00.000Z`);
  }

  private latestDate(left: string, right: string): string {
    return left >= right ? left : right;
  }

  private earliestDate(left: string, right: string): string {
    return left <= right ? left : right;
  }

  private invalidQuoteRangeException(): BadRequestException {
    return new BadRequestException({
      message: 'Quote range is invalid.',
      error: 'INVALID_QUOTE_RANGE',
    });
  }
}
