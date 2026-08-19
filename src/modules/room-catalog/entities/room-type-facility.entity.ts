import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { RoomType } from './room-type.entity';
import { Facility } from './facility.entity';

@Entity({ name: 'room_type_facilities' })
export class RoomTypeFacility {
  @PrimaryColumn('uuid', { name: 'room_type_id' })
  roomTypeId!: string;

  @PrimaryColumn('uuid', { name: 'facility_id' })
  facilityId!: string;

  @ManyToOne(() => RoomType, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_type_id', referencedColumnName: 'id' })
  roomType!: RoomType;

  @ManyToOne(() => Facility, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'facility_id', referencedColumnName: 'id' })
  facility!: Facility;
}
