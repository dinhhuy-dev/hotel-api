import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ROOM_RATE_DATE_PATTERN } from './validation/room-rate-validation';

export class BulkRoomTypeQuoteRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  readonly roomTypeIds!: readonly string[];

  @Matches(ROOM_RATE_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  readonly checkInDate!: string;

  @Matches(ROOM_RATE_DATE_PATTERN)
  @IsDateString({ strict: true, strictSeparator: true })
  readonly checkOutDate!: string;
}
