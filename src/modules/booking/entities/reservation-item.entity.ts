import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Reservation } from './reservation.entity';
import { RoomAssignment } from './room-assignment.entity';

@Entity({ name: 'reservation_items' })
@Index('uq_reservation_items_reservation_room_type', ['reservationId', 'roomTypeId'], {
  unique: true,
})
@Check('ck_reservation_items_quantity', '"quantity" BETWEEN 1 AND 5')
@Check('ck_reservation_items_positive_total_price', '"total_price" > 0')
export class ReservationItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reservation_id', type: 'uuid' })
  reservationId!: string;

  @ManyToOne(() => Reservation, (reservation) => reservation.items, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reservation_id', referencedColumnName: 'id' })
  reservation!: Reservation;

  @Column({ name: 'room_type_id', type: 'uuid' })
  roomTypeId!: string;

  @Column({ name: 'quantity', type: 'integer' })
  quantity!: number;

  @Column({ name: 'total_price', type: 'integer' })
  totalPrice!: number;

  @OneToMany(() => RoomAssignment, (assignment) => assignment.reservationItem)
  assignments!: RoomAssignment[];
}
