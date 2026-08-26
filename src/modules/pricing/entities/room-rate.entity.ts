import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Exclusion,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoomType } from '../../room-catalog/entities/room-type.entity';

@Entity({ name: 'room_rates' })
@Index('idx_room_rates_room_type_dates', ['roomTypeId', 'startDate', 'endDate'])
@Check('ck_room_rates_valid_range', '"start_date" < "end_date"')
@Check('ck_room_rates_positive_price', '"price_per_night" > 0')
@Exclusion(
  'ex_room_rates_no_overlap',
  `USING gist ("room_type_id" WITH =, daterange("start_date", "end_date", '[)') WITH &&)`,
)
export class RoomRate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'room_type_id', type: 'uuid' })
  roomTypeId!: string;

  @ManyToOne(() => RoomType, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_type_id', referencedColumnName: 'id' })
  roomType!: RoomType;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'price_per_night', type: 'integer' })
  pricePerNight!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;
}
