import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { OperationalStatus } from '../../entities/enum/operational-status';

const updateableOperationalStatuses = [
  OperationalStatus.Ready,
  OperationalStatus.Dirty,
  OperationalStatus.Cleaning,
  OperationalStatus.OutOfService,
];

export class UpdateRoomStatusDto {
  @ApiProperty({
    description:
      'Requested room operational status. RETIRED is only set through the retire operation.',
    enum: updateableOperationalStatuses,
    enumName: 'UpdateableOperationalStatus',
    example: OperationalStatus.Dirty,
  })
  @IsIn(updateableOperationalStatuses)
  operationalStatus!: OperationalStatus;
}
