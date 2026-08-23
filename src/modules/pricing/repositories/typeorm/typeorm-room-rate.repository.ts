import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomRate } from '../../entities/room-rate.entity';
import {
  RoomRateListOptions,
  RoomRateListResult,
  RoomRateRepositoryPort,
} from '../ports/room-rate-repository.port';

@Injectable()
export class TypeOrmRoomRateRepository implements RoomRateRepositoryPort {
  constructor(@InjectRepository(RoomRate) private readonly repository: Repository<RoomRate>) {}

  save(roomRate: RoomRate): Promise<RoomRate> {
    return this.repository.save(roomRate);
  }

  async findPage(options: RoomRateListOptions): Promise<RoomRateListResult> {
    const query = this.repository.createQueryBuilder('roomRate');

    if (options.roomTypeId !== undefined) {
      query.andWhere('roomRate.roomTypeId = :roomTypeId', {
        roomTypeId: options.roomTypeId,
      });
    }

    if (options.fromDate !== undefined && options.toDate !== undefined) {
      query
        .andWhere('roomRate.startDate < :toDate', { toDate: options.toDate })
        .andWhere('roomRate.endDate > :fromDate', { fromDate: options.fromDate });
    }

    const [items, totalItems] = await query
      .orderBy('roomRate.startDate', 'DESC')
      .addOrderBy('roomRate.roomTypeId', 'ASC')
      .addOrderBy('roomRate.id', 'ASC')
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();

    return { items, totalItems };
  }

  async findById(id: string): Promise<RoomRate | null> {
    return this.repository.findOneBy({ id });
  }

  findOverlappingForRoomTypes(
    roomTypeIds: readonly string[],
    startDate: string,
    endDate: string,
  ): Promise<RoomRate[]> {
    return this.repository
      .createQueryBuilder('roomRate')
      .where('roomRate.roomTypeId IN (:...roomTypeIds)', { roomTypeIds })
      .andWhere('roomRate.startDate < :endDate', { endDate })
      .andWhere('roomRate.endDate > :startDate', { startDate })
      .orderBy('roomRate.roomTypeId', 'ASC')
      .addOrderBy('roomRate.startDate', 'ASC')
      .addOrderBy('roomRate.id', 'ASC')
      .getMany();
  }

  async remove(roomRate: RoomRate): Promise<void> {
    await this.repository.remove(roomRate);
  }

  hasOverlap(
    roomTypeId: string,
    startDate: string,
    endDate: string,
    excludedId?: string,
  ): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('roomRate')
      .where('roomRate.roomTypeId = :roomTypeId', { roomTypeId })
      .andWhere('roomRate.startDate < :endDate', { endDate })
      .andWhere('roomRate.endDate > :startDate', { startDate });

    if (excludedId !== undefined) {
      query.andWhere('roomRate.id != :excludedId', { excludedId });
    }

    return query.getExists();
  }
}
