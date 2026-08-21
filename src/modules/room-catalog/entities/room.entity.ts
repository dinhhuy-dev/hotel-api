import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OperationalStatus } from './enum/operational-status';
import { RoomType } from './room-type.entity';

@Entity({ name: 'rooms' })
@Index('uq_rooms_room_number', ['roomNumber'], { unique: true })
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'room_number', type: 'varchar', length: 20 })
  roomNumber!: string;

  @Column({ name: 'floor', type: 'varchar', length: 10 })
  floor!: string;

  @Column({ name: 'room_type_id', type: 'uuid' })
  roomTypeId!: string;

  @ManyToOne(() => RoomType, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_type_id', referencedColumnName: 'id' })
  roomType!: RoomType;

  @Column({
    name: 'operational_status',
    type: 'enum',
    enum: OperationalStatus,
    enumName: 'operational_status_enum',
    default: OperationalStatus.OutOfService,
  })
  operationalStatus!: OperationalStatus;

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
