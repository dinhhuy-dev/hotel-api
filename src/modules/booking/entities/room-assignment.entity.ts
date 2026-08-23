import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ReservationItem } from './reservation-item.entity';

@Entity({ name: 'room_assignments' })
@Index('uq_room_assignments_active_room', ['roomId'], {
  unique: true,
  where: '"released_at" IS NULL',
})
export class RoomAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reservation_item_id', type: 'uuid' })
  reservationItemId!: string;

  @ManyToOne(() => ReservationItem, (item) => item.assignments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reservation_item_id', referencedColumnName: 'id' })
  reservationItem!: ReservationItem;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId!: string;

  @Column({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt!: Date | null;
}
