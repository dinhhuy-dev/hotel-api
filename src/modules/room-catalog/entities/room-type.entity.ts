import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'room_types' })
@Index('uq_room_types_code', ['code'], { unique: true })
@Check('ck_room_types_max_occupancy', '"max_occupancy" BETWEEN 1 AND 20')
@Check('ck_room_types_display_order', '"display_order" >= 0')
export class RoomType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'code', type: 'varchar', length: 20 })
  code!: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'description', type: 'varchar', length: 1000, nullable: true })
  description?: string;

  @Column({ name: 'max_occupancy', type: 'integer' })
  maxOccupancy!: number;

  @Column({ name: 'bed_configuration', type: 'varchar', length: 200, nullable: true })
  bedConfiguration?: string;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

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
