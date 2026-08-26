import { Injectable } from '@nestjs/common';
import type { EntityManager, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import {
  BookingAssignmentRoom,
  BookingAvailabilityRoomType,
  BookingRoomCatalogFacility,
  BookingRoomCatalogService,
  FindAvailabilityRoomTypesInput,
  FindRoomsForAssignmentInput,
} from '../../contracts/booking-room-catalog.contract';
import { OperationalStatus } from '../../entities/enum/operational-status';
import { RoomTypeFacility } from '../../entities/room-type-facility.entity';
import { RoomType } from '../../entities/room-type.entity';
import { Room } from '../../entities/room.entity';

interface SellableRoomCountRow {
  readonly roomTypeId: string;
  readonly sellableRoomCount: string;
}

const SELLABLE_ROOM_STATUSES = [
  OperationalStatus.Ready,
  OperationalStatus.Dirty,
  OperationalStatus.Cleaning,
] as const;

@Injectable()
export class TypeOrmBookingRoomCatalogService implements BookingRoomCatalogService {
  async findAvailabilityRoomTypes(
    input: FindAvailabilityRoomTypesInput,
    manager: EntityManager,
  ): Promise<readonly BookingAvailabilityRoomType[]> {
    if (input.roomTypeIds?.length === 0) {
      return [];
    }

    const query = manager
      .getRepository(RoomType)
      .createQueryBuilder('roomType')
      .where('roomType.isActive = :isActive', { isActive: true })
      .orderBy('roomType.id', 'ASC');

    if (input.roomTypeIds !== undefined) {
      query.andWhere('roomType.id IN (:...roomTypeIds)', {
        roomTypeIds: input.roomTypeIds,
      });
    }

    this.applyRequestedLock(query, input.lockForUpdate);

    const roomTypes = await query.getMany();
    const roomTypeIds = roomTypes.map((roomType) => roomType.id);

    if (roomTypeIds.length === 0) {
      return [];
    }

    const [sellableCounts, facilitiesByRoomTypeId] = await Promise.all([
      this.findSellableRoomCounts(roomTypeIds, manager),
      this.findActiveFacilities(roomTypeIds, manager),
    ]);

    return roomTypes.map((roomType) => ({
      id: roomType.id,
      name: roomType.name,
      description: roomType.description,
      maxOccupancy: roomType.maxOccupancy,
      sellableRoomCount: sellableCounts.get(roomType.id) ?? 0,
      facilities: facilitiesByRoomTypeId.get(roomType.id) ?? [],
    }));
  }

  async findRoomsForAssignment(
    input: FindRoomsForAssignmentInput,
    manager: EntityManager,
  ): Promise<readonly BookingAssignmentRoom[]> {
    if (input.roomIds.length === 0) {
      return [];
    }

    const query = manager
      .getRepository(Room)
      .createQueryBuilder('room')
      .where('room.id IN (:...roomIds)', { roomIds: input.roomIds })
      .orderBy('room.id', 'ASC');

    this.applyRequestedLock(query, input.lockForUpdate);

    const rooms = await query.getMany();

    return rooms.map((room) => ({
      id: room.id,
      roomTypeId: room.roomTypeId,
      roomNumber: room.roomNumber,
      operationalStatus: room.operationalStatus,
    }));
  }

  async markRoomsDirty(roomIds: readonly string[], manager: EntityManager): Promise<void> {
    if (roomIds.length === 0) {
      return;
    }

    await manager.getRepository(Room).update([...roomIds], {
      operationalStatus: OperationalStatus.Dirty,
    });
  }

  private applyRequestedLock<Entity extends ObjectLiteral>(
    query: SelectQueryBuilder<Entity>,
    lockForUpdate: boolean,
  ): void {
    if (lockForUpdate) {
      query.setLock('pessimistic_write');
    }
  }

  private async findSellableRoomCounts(
    roomTypeIds: readonly string[],
    manager: EntityManager,
  ): Promise<Map<string, number>> {
    const rows = await manager
      .getRepository(Room)
      .createQueryBuilder('room')
      .select('room.roomTypeId', 'roomTypeId')
      .addSelect('COUNT(room.id)', 'sellableRoomCount')
      .where('room.roomTypeId IN (:...roomTypeIds)', { roomTypeIds })
      .andWhere('room.operationalStatus IN (:...statuses)', {
        statuses: SELLABLE_ROOM_STATUSES,
      })
      .groupBy('room.roomTypeId')
      .getRawMany<SellableRoomCountRow>();

    return new Map(rows.map((row) => [row.roomTypeId, Number.parseInt(row.sellableRoomCount, 10)]));
  }

  private async findActiveFacilities(
    roomTypeIds: readonly string[],
    manager: EntityManager,
  ): Promise<Map<string, BookingRoomCatalogFacility[]>> {
    const assignments = await manager
      .getRepository(RoomTypeFacility)
      .createQueryBuilder('roomTypeFacility')
      .innerJoinAndSelect('roomTypeFacility.facility', 'facility')
      .where('roomTypeFacility.roomTypeId IN (:...roomTypeIds)', { roomTypeIds })
      .andWhere('facility.isActive = :isActive', { isActive: true })
      .orderBy('roomTypeFacility.roomTypeId', 'ASC')
      .addOrderBy('facility.id', 'ASC')
      .getMany();

    const facilitiesByRoomTypeId = new Map<string, BookingRoomCatalogFacility[]>();

    for (const assignment of assignments) {
      const facilities = facilitiesByRoomTypeId.get(assignment.roomTypeId) ?? [];
      facilities.push({ id: assignment.facility.id, name: assignment.facility.name });
      facilitiesByRoomTypeId.set(assignment.roomTypeId, facilities);
    }

    return facilitiesByRoomTypeId;
  }
}
