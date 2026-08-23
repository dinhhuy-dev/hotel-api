import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull } from 'typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { ReservationStatus } from '../../entities/enum/reservation-status';
import { ReservationItem } from '../../entities/reservation-item.entity';
import { Reservation } from '../../entities/reservation.entity';
import { RoomAssignment } from '../../entities/room-assignment.entity';
import {
  BookingRepositoryPort,
  ReservationListOptions,
  ReservationListResult,
  RoomTypeCommitment,
} from '../ports/booking-repository.port';

@Injectable()
export class TypeOrmBookingRepository implements BookingRepositoryPort {
  constructor(
    @InjectRepository(Reservation) private readonly repository: Repository<Reservation>,
  ) {}

  async findCommittedQuantities(
    roomTypeIds: readonly string[],
    checkInDate: string,
    checkOutDate: string,
    now: Date,
    manager?: EntityManager,
  ): Promise<RoomTypeCommitment[]> {
    if (roomTypeIds.length === 0) {
      return [];
    }

    const repository = this.reservationRepository(manager);
    const rows = await repository
      .createQueryBuilder('reservation')
      .innerJoin(ReservationItem, 'item', 'item.reservationId = reservation.id')
      .select('item.roomTypeId', 'roomTypeId')
      .addSelect('SUM(item.quantity)', 'quantity')
      .where('item.roomTypeId IN (:...roomTypeIds)', { roomTypeIds })
      .andWhere('reservation.checkInDate < :checkOutDate', { checkOutDate })
      .andWhere('reservation.checkOutDate > :checkInDate', { checkInDate })
      .andWhere(
        `(
          reservation.status IN (:...committedStatuses)
          OR (reservation.status = :pendingStatus AND reservation.expiresAt > :now)
        )`,
        {
          committedStatuses: [ReservationStatus.Confirmed, ReservationStatus.CheckedIn],
          pendingStatus: ReservationStatus.Pending,
          now,
        },
      )
      .groupBy('item.roomTypeId')
      .orderBy('item.roomTypeId', 'ASC')
      .getRawMany<{ roomTypeId: string; quantity: string }>();

    return rows.map((row) => ({
      roomTypeId: row.roomTypeId,
      quantity: Number(row.quantity),
    }));
  }

  findByIdempotencyKey(
    idempotencyKey: string,
    manager: EntityManager,
  ): Promise<Reservation | null> {
    return this.findOneWithDetails({ idempotencyKey }, manager);
  }

  findWithDetailsById(id: string, manager: EntityManager): Promise<Reservation | null> {
    return this.findOneWithDetails({ id }, manager);
  }

  async findPage(
    options: ReservationListOptions,
    manager: EntityManager,
  ): Promise<ReservationListResult> {
    const query = this.reservationRepository(manager)
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.items', 'item')
      .leftJoinAndSelect('item.assignments', 'assignment');

    if (options.customerId !== undefined) {
      query.andWhere('reservation.customerId = :customerId', {
        customerId: options.customerId,
      });
    }

    if (options.status !== undefined) {
      query.andWhere('reservation.status = :status', { status: options.status });
    }

    if (options.checkInDate !== undefined) {
      query.andWhere('reservation.checkInDate = :checkInDate', {
        checkInDate: options.checkInDate,
      });
    }

    if (options.checkOutDate !== undefined) {
      query.andWhere('reservation.checkOutDate = :checkOutDate', {
        checkOutDate: options.checkOutDate,
      });
    }

    const [items, totalItems] = await query
      .orderBy('reservation.createdAt', 'DESC')
      .addOrderBy('reservation.id', 'ASC')
      .addOrderBy('item.roomTypeId', 'ASC')
      .addOrderBy('assignment.roomId', 'ASC')
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();

    return { items, totalItems };
  }

  findAndLockById(id: string, manager: EntityManager): Promise<Reservation | null> {
    return this.reservationRepository(manager).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  saveReservation(reservation: Reservation, manager: EntityManager): Promise<Reservation> {
    return this.reservationRepository(manager).save(reservation);
  }

  saveReservationItems(
    items: readonly ReservationItem[],
    manager: EntityManager,
  ): Promise<ReservationItem[]> {
    return manager.getRepository(ReservationItem).save([...items]);
  }

  findActiveAssignmentsByRoomIds(
    roomIds: readonly string[],
    manager: EntityManager,
  ): Promise<RoomAssignment[]> {
    if (roomIds.length === 0) {
      return Promise.resolve([]);
    }

    return manager.getRepository(RoomAssignment).find({
      where: { roomId: In([...roomIds]), releasedAt: IsNull() },
      order: { roomId: 'ASC', id: 'ASC' },
    });
  }

  findAndLockActiveAssignmentsByReservationId(
    reservationId: string,
    manager: EntityManager,
  ): Promise<RoomAssignment[]> {
    return manager
      .getRepository(RoomAssignment)
      .createQueryBuilder('assignment')
      .innerJoin('assignment.reservationItem', 'item')
      .where('item.reservationId = :reservationId', { reservationId })
      .andWhere('assignment.releasedAt IS NULL')
      .orderBy('assignment.roomId', 'ASC')
      .addOrderBy('assignment.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
  }

  saveRoomAssignments(
    assignments: readonly RoomAssignment[],
    manager: EntityManager,
  ): Promise<RoomAssignment[]> {
    return manager.getRepository(RoomAssignment).save([...assignments]);
  }

  private reservationRepository(manager?: EntityManager): Repository<Reservation> {
    return manager?.getRepository(Reservation) ?? this.repository;
  }

  private findOneWithDetails(
    where: { readonly id?: string; readonly idempotencyKey?: string },
    manager: EntityManager,
  ): Promise<Reservation | null> {
    return this.reservationRepository(manager).findOne({
      where,
      relations: {
        items: {
          assignments: true,
        },
      },
      order: {
        items: {
          roomTypeId: 'ASC',
          assignments: {
            roomId: 'ASC',
          },
        },
      },
    });
  }
}
