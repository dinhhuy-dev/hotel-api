import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import {
  PRICING_QUOTE_SERVICE,
  type PricingQuoteContract,
} from '../../pricing/contracts/pricing-quote.contract';
import {
  BOOKING_ROOM_CATALOG_SERVICE,
  type BookingAvailabilityRoomType,
  type BookingRoomCatalogService,
} from '../../room-catalog/contracts/booking-room-catalog.contract';
import { DataSource } from 'typeorm';
import { BOOKING_CLOCK, type BookingClock } from '../contracts/booking-clock.contract';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';
import {
  AvailabilityOptionDto,
  type AvailabilityOptionItemDto,
} from '../dto/availability-response.dto';
import type { BookingRepositoryPort } from '../repositories/ports/booking-repository.port';
import { BOOKING_REPOSITORY } from '../repositories/ports/booking-repository.token';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MAXIMUM_STAY_NIGHTS = 30;
const MAXIMUM_CANDIDATE_COUNT = 10;

interface AvailabilityCandidate {
  readonly roomType: BookingAvailabilityRoomType;
  readonly availableQuantity: number;
  readonly pricePerRoomStay: number;
}

interface SelectedCandidate {
  readonly candidate: AvailabilityCandidate;
  readonly quantity: number;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @Inject(BOOKING_ROOM_CATALOG_SERVICE)
    private readonly roomCatalogService: Pick<
      BookingRoomCatalogService,
      'findAvailabilityRoomTypes'
    >,
    @Inject(BOOKING_REPOSITORY)
    private readonly repository: Pick<BookingRepositoryPort, 'findCommittedQuantities'>,
    @Inject(PRICING_QUOTE_SERVICE)
    private readonly pricingQuoteService: Pick<PricingQuoteContract, 'quote'>,
    @Inject(BOOKING_CLOCK) private readonly clock: BookingClock,
    private readonly dataSource: DataSource,
  ) {}

  async search(dto: AvailabilityQueryDto): Promise<PaginatedResult<AvailabilityOptionDto>> {
    this.validateSearchRange(dto);

    const roomTypes = await this.roomCatalogService.findAvailabilityRoomTypes(
      dto.roomTypeId === undefined
        ? { lockForUpdate: false }
        : { roomTypeIds: [dto.roomTypeId], lockForUpdate: false },
      this.dataSource.manager,
    );
    const sortedRoomTypes = [...roomTypes].sort((left, right) => left.id.localeCompare(right.id));
    const roomTypeIds = sortedRoomTypes.map((roomType) => roomType.id);

    if (roomTypeIds.length === 0) {
      return this.paginate([], dto);
    }

    const [commitments, pricing] = await Promise.all([
      this.repository.findCommittedQuantities(
        roomTypeIds,
        dto.checkInDate,
        dto.checkOutDate,
        this.clock.now(),
      ),
      this.pricingQuoteService.quote({
        roomTypeIds,
        checkInDate: dto.checkInDate,
        checkOutDate: dto.checkOutDate,
      }),
    ]);
    const committedByRoomTypeId = new Map(
      commitments.map((commitment) => [commitment.roomTypeId, commitment.quantity]),
    );
    const quoteByRoomTypeId = new Map(
      pricing.quotes.map((quote) => [quote.roomTypeId, quote.pricePerRoomStay]),
    );
    const candidates = sortedRoomTypes.flatMap((roomType): AvailabilityCandidate[] => {
      const availableQuantity =
        roomType.sellableRoomCount - (committedByRoomTypeId.get(roomType.id) ?? 0);
      const pricePerRoomStay = quoteByRoomTypeId.get(roomType.id);

      if (availableQuantity <= 0 || pricePerRoomStay === undefined) {
        return [];
      }

      return [{ roomType, availableQuantity, pricePerRoomStay }];
    });

    if (candidates.length > MAXIMUM_CANDIDATE_COUNT) {
      throw new BadRequestException({
        message: 'Availability search is too broad.',
        error: 'AVAILABILITY_SEARCH_TOO_BROAD',
      });
    }

    const options = this.generateOptions(candidates, dto);
    options.sort(
      (left, right) =>
        left.totalPrice - right.totalPrice ||
        left.items.length - right.items.length ||
        this.optionSignature(left).localeCompare(this.optionSignature(right)),
    );

    return this.paginate(options, dto);
  }

  private validateSearchRange(dto: AvailabilityQueryDto): void {
    const nightCount = this.countNights(dto.checkInDate, dto.checkOutDate);

    if (
      dto.checkInDate < this.clock.today() ||
      dto.checkOutDate <= dto.checkInDate ||
      nightCount > MAXIMUM_STAY_NIGHTS
    ) {
      throw new BadRequestException({
        message: 'Availability search is invalid.',
        error: 'INVALID_AVAILABILITY_SEARCH',
      });
    }
  }

  private generateOptions(
    candidates: readonly AvailabilityCandidate[],
    dto: AvailabilityQueryDto,
  ): AvailabilityOptionDto[] {
    const options: AvailabilityOptionDto[] = [];
    const selected: SelectedCandidate[] = [];
    const suffixAvailableQuantity = new Array<number>(candidates.length + 1).fill(0);

    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      suffixAvailableQuantity[index] =
        suffixAvailableQuantity[index + 1] +
        Math.min(candidates[index].availableQuantity, dto.roomQuantity);
    }

    const visit = (index: number, remainingQuantity: number, totalCapacity: number): void => {
      if (remainingQuantity === 0) {
        if (totalCapacity >= dto.guestCount) {
          options.push(this.buildOption(selected, totalCapacity, dto.roomQuantity));
        }

        return;
      }

      if (
        index === candidates.length ||
        suffixAvailableQuantity[index] < remainingQuantity ||
        totalCapacity + this.maximumAdditionalCapacity(candidates, index, remainingQuantity) <
          dto.guestCount
      ) {
        return;
      }

      const candidate = candidates[index];
      const maximumQuantity = Math.min(candidate.availableQuantity, remainingQuantity);

      for (let quantity = 0; quantity <= maximumQuantity; quantity += 1) {
        if (quantity > 0) {
          selected.push({ candidate, quantity });
        }

        visit(
          index + 1,
          remainingQuantity - quantity,
          totalCapacity + quantity * candidate.roomType.maxOccupancy,
        );

        if (quantity > 0) {
          selected.pop();
        }
      }
    };

    visit(0, dto.roomQuantity, 0);

    return options;
  }

  private maximumAdditionalCapacity(
    candidates: readonly AvailabilityCandidate[],
    startIndex: number,
    roomQuantity: number,
  ): number {
    const remainingCandidates = candidates
      .slice(startIndex)
      .sort((left, right) => right.roomType.maxOccupancy - left.roomType.maxOccupancy);
    let remainingQuantity = roomQuantity;
    let capacity = 0;

    for (const candidate of remainingCandidates) {
      const quantity = Math.min(candidate.availableQuantity, remainingQuantity);
      capacity += quantity * candidate.roomType.maxOccupancy;
      remainingQuantity -= quantity;

      if (remainingQuantity === 0) {
        break;
      }
    }

    return capacity;
  }

  private buildOption(
    selected: readonly SelectedCandidate[],
    totalCapacity: number,
    totalRoomQuantity: number,
  ): AvailabilityOptionDto {
    const items = selected.map(({ candidate, quantity }): AvailabilityOptionItemDto => ({
      roomTypeId: candidate.roomType.id,
      name: candidate.roomType.name,
      description: candidate.roomType.description,
      selectedQuantity: quantity,
      maxOccupancy: candidate.roomType.maxOccupancy,
      availableQuantity: candidate.availableQuantity,
      pricePerRoomStay: candidate.pricePerRoomStay,
      subtotal: quantity * candidate.pricePerRoomStay,
      facilities: candidate.roomType.facilities.map((facility) => ({
        id: facility.id,
        name: facility.name,
      })),
    }));

    return {
      items,
      totalRoomQuantity,
      totalCapacity,
      totalPrice: items.reduce((total, item) => total + item.subtotal, 0),
    };
  }

  private optionSignature(option: AvailabilityOptionDto): string {
    return option.items.map((item) => `${item.roomTypeId}:${item.selectedQuantity}`).join('|');
  }

  private paginate(
    options: readonly AvailabilityOptionDto[],
    dto: Pick<AvailabilityQueryDto, 'page' | 'limit'>,
  ): PaginatedResult<AvailabilityOptionDto> {
    const startIndex = (dto.page - 1) * dto.limit;

    return new PaginatedResult(options.slice(startIndex, startIndex + dto.limit), {
      page: dto.page,
      pageSize: dto.limit,
      totalItems: options.length,
      totalPages: Math.ceil(options.length / dto.limit),
    });
  }

  private countNights(startDate: string, endDate: string): number {
    return (
      (Date.parse(`${endDate}T00:00:00.000Z`) - Date.parse(`${startDate}T00:00:00.000Z`)) /
      MILLISECONDS_PER_DAY
    );
  }
}
