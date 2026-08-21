import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  ILike,
  In,
  Not,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { OperationalStatus } from '../../entities/enum/operational-status';
import { Facility } from '../../entities/facility.entity';
import { RoomTypeFacility } from '../../entities/room-type-facility.entity';
import { RoomType } from '../../entities/room-type.entity';
import { Room } from '../../entities/room.entity';
import {
  CreateRoomResult,
  RestoreRoomResult,
  RetireRoomResult,
  RoomListOptions,
  RoomListResult,
  RoomRepositoryPort,
  RoomWithDetails,
  UpdateRoomInput,
  UpdateRoomResult,
  UpdateRoomStatusResult,
} from '../ports/room-repository.port';

const isPostgresUniqueViolation = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error as QueryFailedError & { code?: string }).code === '23505';

const allowedStatusTransitions: Readonly<Record<OperationalStatus, readonly OperationalStatus[]>> =
  {
    [OperationalStatus.Ready]: [OperationalStatus.Dirty, OperationalStatus.OutOfService],
    [OperationalStatus.Dirty]: [OperationalStatus.Cleaning, OperationalStatus.OutOfService],
    [OperationalStatus.Cleaning]: [OperationalStatus.Ready, OperationalStatus.OutOfService],
    [OperationalStatus.OutOfService]: [OperationalStatus.Dirty],
    [OperationalStatus.Retired]: [],
  };

@Injectable()
export class TypeOrmRoomRepository implements RoomRepositoryPort {
  constructor(
    @InjectRepository(Room) private readonly repository: Repository<Room>,
    @InjectRepository(RoomTypeFacility)
    private readonly roomTypeFacilityRepository: Repository<RoomTypeFacility>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findByRoomNumber(roomNumber: string): Promise<Room | null> {
    return this.repository.findOneBy({ roomNumber });
  }

  async findAllWithDetails(options: RoomListOptions): Promise<RoomListResult> {
    return this.findPageWithDetails(options);
  }

  async findAllNonRetiredWithDetails(options: RoomListOptions): Promise<RoomListResult> {
    return this.findPageWithDetails(options, true);
  }

  private async findPageWithDetails(
    options: RoomListOptions,
    excludeRetired = false,
  ): Promise<RoomListResult> {
    if (excludeRetired && options.operationalStatus === OperationalStatus.Retired) {
      return { items: [], totalItems: 0 };
    }

    const where: FindOptionsWhere<Room> = {
      ...(options.search ? { roomNumber: ILike(`%${options.search}%`) } : {}),
      ...(options.roomTypeId ? { roomTypeId: options.roomTypeId } : {}),
      ...(options.floor ? { floor: options.floor } : {}),
      ...(options.operationalStatus !== undefined
        ? { operationalStatus: options.operationalStatus }
        : excludeRetired
          ? { operationalStatus: Not(OperationalStatus.Retired) }
          : {}),
    };

    const [rooms, totalItems] = await this.repository.findAndCount({
      where,
      relations: {
        roomType: true,
      },
      order: {
        roomNumber: 'ASC',
        id: 'ASC',
      },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });

    const facilitiesByRoomTypeId = await this.findFacilitiesByRoomTypeIds(
      rooms.map((room) => room.roomTypeId),
    );

    return {
      items: rooms.map((room) => ({
        room,
        roomType: room.roomType,
        facilities: facilitiesByRoomTypeId.get(room.roomTypeId) ?? [],
      })),
      totalItems,
    };
  }

  async findWithDetailsById(id: string): Promise<RoomWithDetails | null> {
    const room = await this.repository.findOne({
      where: { id },
      relations: {
        roomType: true,
      },
    });

    if (room === null) {
      return null;
    }

    const facilitiesByRoomTypeId = await this.findFacilitiesByRoomTypeIds([room.roomTypeId]);

    return {
      room,
      roomType: room.roomType,
      facilities: facilitiesByRoomTypeId.get(room.roomTypeId) ?? [],
    };
  }

  async create(room: Room): Promise<CreateRoomResult> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const roomTypeRepository = manager.getRepository(RoomType);
        const roomRepository = manager.getRepository(Room);
        const roomType = await roomTypeRepository.findOne({
          where: { id: room.roomTypeId },
          lock: { mode: 'pessimistic_write' },
        });

        if (roomType === null) {
          return { kind: 'room-type-not-found' };
        }

        if (!roomType.isActive) {
          return { kind: 'inactive-room-type' };
        }

        const savedRoom = await roomRepository.save(room);
        const facilities = await this.findFacilitiesByRoomTypeIds(
          [roomType.id],
          manager.getRepository(RoomTypeFacility),
        );

        return {
          kind: 'created',
          details: {
            room: savedRoom,
            roomType,
            facilities: facilities.get(roomType.id) ?? [],
          },
        };
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        return { kind: 'duplicate-room-number' };
      }

      throw error;
    }
  }

  async update(id: string, input: UpdateRoomInput): Promise<UpdateRoomResult> {
    const { roomNumber, floor, roomTypeId } = input;

    if (roomNumber === null || floor === null || roomTypeId === null) {
      return { kind: 'invalid-input' };
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const roomRepository = manager.getRepository(Room);
        const roomTypeRepository = manager.getRepository(RoomType);
        const room = await roomRepository.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });

        if (room === null) {
          return { kind: 'not-found' };
        }

        if (room.operationalStatus === OperationalStatus.Retired) {
          return { kind: 'room-retired' };
        }

        let roomType = await roomTypeRepository.findOneBy({ id: room.roomTypeId });

        if (roomType === null) {
          return { kind: 'room-type-not-found' };
        }

        if (roomTypeId !== undefined && roomTypeId !== room.roomTypeId) {
          if (room.operationalStatus !== OperationalStatus.OutOfService) {
            return { kind: 'room-type-change-not-allowed' };
          }

          roomType = await roomTypeRepository.findOne({
            where: { id: roomTypeId },
            lock: { mode: 'pessimistic_write' },
          });

          if (roomType === null) {
            return { kind: 'room-type-not-found' };
          }

          if (!roomType.isActive) {
            return { kind: 'inactive-room-type' };
          }

          room.roomTypeId = roomType.id;
        }

        if (roomNumber !== undefined) {
          room.roomNumber = roomNumber;
        }

        if (floor !== undefined) {
          room.floor = floor;
        }

        const savedRoom = await roomRepository.save(room);
        const facilities = await this.findFacilitiesByRoomTypeIds(
          [roomType.id],
          manager.getRepository(RoomTypeFacility),
        );

        return {
          kind: 'updated',
          details: {
            room: savedRoom,
            roomType,
            facilities: facilities.get(roomType.id) ?? [],
          },
        };
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        return { kind: 'duplicate-room-number' };
      }

      throw error;
    }
  }

  async updateStatus(id: string, status: OperationalStatus): Promise<UpdateRoomStatusResult> {
    return this.dataSource.transaction(async (manager) => {
      const roomRepository = manager.getRepository(Room);
      const room = await roomRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (room === null) {
        return { kind: 'not-found' };
      }

      const isSameStatus = room.operationalStatus === status;

      if (!isSameStatus) {
        if (!allowedStatusTransitions[room.operationalStatus].includes(status)) {
          return { kind: 'invalid-transition' };
        }

        room.operationalStatus = status;
      }

      const savedRoom = isSameStatus ? room : await roomRepository.save(room);
      const details = await this.getDetailsInTransaction(manager, savedRoom);

      if (details === null) {
        return { kind: 'not-found' };
      }

      return { kind: 'updated', details };
    });
  }

  async retire(id: string): Promise<RetireRoomResult> {
    return this.dataSource.transaction(async (manager) => {
      const roomRepository = manager.getRepository(Room);
      const room = await roomRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (room === null) {
        return { kind: 'not-found' };
      }

      const isAlreadyRetired = room.operationalStatus === OperationalStatus.Retired;

      if (!isAlreadyRetired) {
        room.operationalStatus = OperationalStatus.Retired;
      }

      const savedRoom = isAlreadyRetired ? room : await roomRepository.save(room);
      const details = await this.getDetailsInTransaction(manager, savedRoom);

      if (details === null) {
        return { kind: 'not-found' };
      }

      return { kind: 'retired', details };
    });
  }

  async restore(id: string): Promise<RestoreRoomResult> {
    return this.dataSource.transaction(async (manager) => {
      const roomRepository = manager.getRepository(Room);
      const roomTypeRepository = manager.getRepository(RoomType);
      const room = await roomRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (room === null) {
        return { kind: 'not-found' };
      }

      if (room.operationalStatus !== OperationalStatus.Retired) {
        return { kind: 'room-not-retired' };
      }

      const roomType = await roomTypeRepository.findOne({
        where: { id: room.roomTypeId },
        lock: { mode: 'pessimistic_write' },
      });

      if (roomType === null) {
        return { kind: 'room-type-not-found' };
      }

      if (!roomType.isActive) {
        return { kind: 'inactive-room-type' };
      }

      room.operationalStatus = OperationalStatus.OutOfService;
      const savedRoom = await roomRepository.save(room);
      const facilities = await this.findFacilitiesByRoomTypeIds(
        [roomType.id],
        manager.getRepository(RoomTypeFacility),
      );

      return {
        kind: 'restored',
        details: {
          room: savedRoom,
          roomType,
          facilities: facilities.get(roomType.id) ?? [],
        },
      };
    });
  }

  private async getDetailsInTransaction(
    manager: EntityManager,
    room: Room,
  ): Promise<RoomWithDetails | null> {
    const roomType = await manager.getRepository(RoomType).findOneBy({ id: room.roomTypeId });

    if (roomType === null) {
      return null;
    }

    const facilities = await this.findFacilitiesByRoomTypeIds(
      [roomType.id],
      manager.getRepository(RoomTypeFacility),
    );

    return {
      room,
      roomType,
      facilities: facilities.get(roomType.id) ?? [],
    };
  }

  private async findFacilitiesByRoomTypeIds(
    roomTypeIds: string[],
    roomTypeFacilityRepository: Repository<RoomTypeFacility> = this.roomTypeFacilityRepository,
  ): Promise<Map<string, Facility[]>> {
    if (roomTypeIds.length === 0) {
      return new Map();
    }

    const assignments = await roomTypeFacilityRepository.find({
      where: {
        roomTypeId: In(roomTypeIds),
      },
      relations: {
        facility: true,
      },
      order: {
        roomTypeId: 'ASC',
        facilityId: 'ASC',
      },
    });

    const facilitiesByRoomTypeId = new Map<string, Facility[]>();

    for (const assignment of assignments) {
      const facilities = facilitiesByRoomTypeId.get(assignment.roomTypeId) ?? [];
      facilities.push(assignment.facility);
      facilitiesByRoomTypeId.set(assignment.roomTypeId, facilities);
    }

    return facilitiesByRoomTypeId;
  }
}
