import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CancellationReason } from './enum/cancellation-reason';
import { PaymentStatus } from './enum/payment-status';
import { ReservationStatus } from './enum/reservation-status';
import { ReservationItem } from './reservation-item.entity';

@Entity({ name: 'reservations' })
@Index('uq_reservations_idempotency_key', ['idempotencyKey'], { unique: true })
@Index('idx_reservations_customer_created', ['customerId', 'createdAt'])
@Index('idx_reservations_status_stay_dates', ['status', 'checkInDate', 'checkOutDate'])
@Check('ck_reservations_valid_range', '"check_in_date" < "check_out_date"')
@Check('ck_reservations_positive_guest_count', '"guest_count" > 0')
@Check('ck_reservations_positive_total_amount', '"total_amount" > 0')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'contact_name', type: 'varchar', length: 100 })
  contactName!: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 16 })
  contactPhone!: string;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate!: string;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate!: string;

  @Column({ name: 'guest_count', type: 'integer' })
  guestCount!: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ReservationStatus,
    enumName: 'reservation_status_enum',
    default: ReservationStatus.Pending,
  })
  status!: ReservationStatus;

  @Column({ name: 'total_amount', type: 'integer' })
  totalAmount!: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'reservation_payment_status_enum',
    default: PaymentStatus.Unpaid,
  })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'charge_request_id', type: 'uuid', nullable: true })
  chargeRequestId!: string | null;

  @Column({ name: 'charge_reference', type: 'varchar', length: 100, nullable: true })
  chargeReference!: string | null;

  @Column({ name: 'refund_request_id', type: 'uuid', nullable: true })
  refundRequestId!: string | null;

  @Column({ name: 'refund_reference', type: 'varchar', length: 100, nullable: true })
  refundReference!: string | null;

  @Column({ name: 'idempotency_key', type: 'uuid' })
  idempotencyKey!: string;

  @Column({
    name: 'cancellation_reason',
    type: 'enum',
    enum: CancellationReason,
    enumName: 'reservation_cancellation_reason_enum',
    nullable: true,
  })
  cancellationReason!: CancellationReason | null;

  @Column({ name: 'checked_in_at', type: 'timestamptz', nullable: true })
  checkedInAt!: Date | null;

  @Column({ name: 'checked_out_at', type: 'timestamptz', nullable: true })
  checkedOutAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @OneToMany(() => ReservationItem, (item) => item.reservation)
  items!: ReservationItem[];
}
