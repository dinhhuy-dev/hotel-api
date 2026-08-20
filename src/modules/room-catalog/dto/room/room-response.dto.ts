import { OperationalStatus } from '../../entities/enum/operational-status';

export class RoomResponseDto {
  id!: string;

  roomNumber!: string;

  floor!: string;

  roomTypeId!: string;

  operationalStatus!: OperationalStatus;
}
