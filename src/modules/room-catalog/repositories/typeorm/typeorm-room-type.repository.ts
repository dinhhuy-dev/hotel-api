import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { RoomType } from '../../entities/room-type.entity';
import {
  AddRoomTypeFacilitiesResult,
  ChangeRoomTypeFacilitiesInput,
  CreateRoomTypeInput,
  CreateRoomTypeResult,
  PublicRoomTypeListOptions,
  PublicRoomTypeListResult,
  RemoveRoomTypeFacilitiesResult,
  RoomTypeDeactivationResult,
  RoomTypeListOptions,
  RoomTypeListResult,
  RoomTypeRepositoryPort,
  RoomTypeRestoreResult,
  RoomTypeWithFacilities,
} from '../ports/room-type-repository.port';
import { DataSource, FindOptionsWhere, ILike, In, QueryFailedError, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Facility } from '../../entities/facility.entity';
import { RoomTypeFacility } from '../../entities/room-type-facility.entity';
import { OperationalStatus } from '../../entities/enum/operational-status';
import { Room } from '../../entities/room.entity';

const isPostgresUniqueViolation = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  (error as QueryFailedError & { code?: string }).code === '23505';

@Injectable()
export class TypeOrmRoomTypeRepository implements RoomTypeRepositoryPort {
  constructor(
    @InjectRepository(RoomType) private readonly repository: Repository<RoomType>,
    @InjectRepository(RoomTypeFacility)
    private readonly roomTypeFacilityRepository: Repository<RoomTypeFacility>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<RoomType | null> {
    return this.repository.findOneBy({ id });
  }
  async findAll(): Promise<RoomType[]> {
    return this.repository.find({
      order: {
        displayOrder: 'ASC',
        code: 'ASC',
        id: 'ASC',
      },
    });
  }
  async findAllWithFacilities(options: RoomTypeListOptions): Promise<RoomTypeListResult> {
    const activeFilter: FindOptionsWhere<RoomType> =
      options.isActive === undefined ? {} : { isActive: options.isActive };

    const where: FindOptionsWhere<RoomType> | FindOptionsWhere<RoomType>[] = options.search
      ? [
          {
            ...activeFilter,
            code: ILike(`%${options.search}%`),
          },
          {
            ...activeFilter,
            name: ILike(`%${options.search}%`),
          },
        ]
      : activeFilter;

    const [roomTypes, totalItems] = await this.repository.findAndCount({
      where,
      order: {
        displayOrder: 'ASC',
        code: 'ASC',
        id: 'ASC',
      },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });

    const facilitiesByRoomTypeId = await this.findFacilitiesByRoomTypeIds(
      roomTypes.map((roomType) => roomType.id),
    );

    return {
      items: roomTypes.map((roomType) => ({
        roomType,
        facilities: facilitiesByRoomTypeId.get(roomType.id) ?? [],
      })),
      totalItems,
    };
  }

  async findWithFacilitiesById(id: string): Promise<RoomTypeWithFacilities | null> {
    const roomType = await this.repository.findOneBy({ id });

    if (roomType == null) {
      return null;
    }

    const facilitiesByRoomTypeId = await this.findFacilitiesByRoomTypeIds([roomType.id]);

    return {
      roomType,
      facilities: facilitiesByRoomTypeId.get(roomType.id) ?? [],
    };
  }

  async findActivePage(options: PublicRoomTypeListOptions): Promise<PublicRoomTypeListResult> {
    const where: FindOptionsWhere<RoomType> | FindOptionsWhere<RoomType>[] = options.search
      ? [
          {
            isActive: true,
            code: ILike(`%${options.search}%`),
          },
          {
            isActive: true,
            name: ILike(`%${options.search}%`),
          },
        ]
      : { isActive: true };

    const [items, totalItems] = await this.repository.findAndCount({
      where,
      order: {
        displayOrder: 'ASC',
        name: 'ASC',
        id: 'ASC',
      },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });

    return { items, totalItems };
  }

  async findActiveWithActiveFacilitiesById(id: string): Promise<RoomTypeWithFacilities | null> {
    const roomType = await this.repository.findOneBy({ id, isActive: true });

    if (roomType === null) {
      return null;
    }

    const assignments = await this.roomTypeFacilityRepository
      .createQueryBuilder('roomTypeFacility')
      .innerJoinAndSelect('roomTypeFacility.facility', 'facility')
      .where('roomTypeFacility.roomTypeId = :roomTypeId', { roomTypeId: roomType.id })
      .andWhere('facility.isActive = :isActive', { isActive: true })
      .orderBy('roomTypeFacility.facilityId', 'ASC')
      .getMany();

    return {
      roomType,
      facilities: assignments.map((assignment) => assignment.facility),
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

  private async findAndLockFacilitiesByIds(
    facilityRepository: Repository<Facility>,
    facilityIds: readonly string[],
  ): Promise<Facility[]> {
    if (facilityIds.length === 0) {
      return [];
    }

    return facilityRepository
      .createQueryBuilder('facility')
      .where('facility.id IN (:...facilityIds)', { facilityIds })
      .orderBy('facility.id', 'ASC')
      .setLock('pessimistic_write')
      .getMany();
  }

  async save(roomType: RoomType): Promise<RoomType> {
    return this.repository.save(roomType);
  }
  async createWithFacilities(input: CreateRoomTypeInput): Promise<CreateRoomTypeResult> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const roomTypeRepository = manager.getRepository(RoomType);
        const facilityRepository = manager.getRepository(Facility);
        const assignmentRepository = manager.getRepository(RoomTypeFacility);

        const existingRoomType = await roomTypeRepository.findOneBy({ code: input.roomType.code });
        if (existingRoomType !== null) {
          return { kind: 'duplicate-code' };
        }

        const facilityIds = [...input.facilityIds].sort();

        const facilities = await this.findAndLockFacilitiesByIds(facilityRepository, facilityIds);

        const foundIds = new Set(facilities.map((facility) => facility.id));
        const missingFacilityIds = facilityIds.filter((facilityId) => !foundIds.has(facilityId));

        const inactiveFacilityIds = facilities
          .filter((facility) => !facility.isActive)
          .map((facility) => facility.id);

        if (missingFacilityIds.length > 0 || inactiveFacilityIds.length > 0) {
          return {
            kind: 'invalid-facilities',
            missingFacilityIds,
            inactiveFacilityIds,
          };
        }

        const savedRoomType = await roomTypeRepository.save(input.roomType);

        if (facilities.length > 0) {
          const assignments = facilities.map((facility) => {
            const assignment = new RoomTypeFacility();
            assignment.roomTypeId = savedRoomType.id;
            assignment.facilityId = facility.id;
            return assignment;
          });

          await assignmentRepository.save(assignments);
        }

        return {
          kind: 'created',
          roomType: savedRoomType,
          facilities,
        };
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        return { kind: 'duplicate-code' };
      }

      throw error;
    }
  }

  async addFacilities(input: ChangeRoomTypeFacilitiesInput): Promise<AddRoomTypeFacilitiesResult> {
    return this.dataSource.transaction(async (manager) => {
      const roomTypeRepository = manager.getRepository(RoomType);
      const facilityRepository = manager.getRepository(Facility);
      const assignmentRepository = manager.getRepository(RoomTypeFacility);

      const roomType = await roomTypeRepository.findOne({
        where: { id: input.roomTypeId },
        lock: { mode: 'pessimistic_write' },
      });

      if (roomType === null) {
        return { kind: 'not-found' };
      }

      const facilityIds = [...input.facilityIds].sort();
      const facilities = await this.findAndLockFacilitiesByIds(facilityRepository, facilityIds);

      const foundFacilityIds = new Set(facilities.map((facility) => facility.id));
      const missingFacilityIds = facilityIds.filter(
        (facilityId) => !foundFacilityIds.has(facilityId),
      );
      const inactiveFacilityIds = facilities
        .filter((facility) => !facility.isActive)
        .map((facility) => facility.id);

      if (missingFacilityIds.length > 0 || inactiveFacilityIds.length > 0) {
        return {
          kind: 'invalid-facilities',
          missingFacilityIds,
          inactiveFacilityIds,
        };
      }

      let existingAssignments: RoomTypeFacility[] = [];

      if (facilityIds.length > 0) {
        existingAssignments = await assignmentRepository.find({
          where: {
            roomTypeId: roomType.id,
            facilityId: In(facilityIds),
          },
        });
      }

      const assignedFacilityIds = new Set(
        existingAssignments.map((assignment) => assignment.facilityId),
      );
      const newAssignments = facilities
        .filter((facility) => !assignedFacilityIds.has(facility.id))
        .map((facility) => {
          const assignment = new RoomTypeFacility();
          assignment.roomTypeId = roomType.id;
          assignment.facilityId = facility.id;
          return assignment;
        });

      if (newAssignments.length > 0) {
        await assignmentRepository.save(newAssignments);
      }

      const facilitiesByRoomTypeId = await this.findFacilitiesByRoomTypeIds(
        [roomType.id],
        assignmentRepository,
      );

      return {
        kind: 'changed',
        roomType,
        facilities: facilitiesByRoomTypeId.get(roomType.id) ?? [],
      };
    });
  }

  async removeFacilities(
    input: ChangeRoomTypeFacilitiesInput,
  ): Promise<RemoveRoomTypeFacilitiesResult> {
    return this.dataSource.transaction(async (manager) => {
      const roomTypeRepository = manager.getRepository(RoomType);
      const facilityRepository = manager.getRepository(Facility);
      const assignmentRepository = manager.getRepository(RoomTypeFacility);

      const roomType = await roomTypeRepository.findOne({
        where: { id: input.roomTypeId },
        lock: { mode: 'pessimistic_write' },
      });

      if (roomType === null) {
        return { kind: 'not-found' };
      }

      const facilityIds = [...input.facilityIds].sort();

      await this.findAndLockFacilitiesByIds(facilityRepository, facilityIds);

      if (facilityIds.length > 0) {
        await assignmentRepository.delete({
          roomTypeId: roomType.id,
          facilityId: In(facilityIds),
        });
      }

      const facilitiesByRoomTypeId = await this.findFacilitiesByRoomTypeIds(
        [roomType.id],
        assignmentRepository,
      );

      return {
        kind: 'changed',
        roomType,
        facilities: facilitiesByRoomTypeId.get(roomType.id) ?? [],
      };
    });
  }

  async deactivate(id: string): Promise<RoomTypeDeactivationResult> {
    return this.dataSource.transaction(async (manager) => {
      const roomTypeRepository = manager.getRepository(RoomType);
      const roomTypeFacilityRepository = manager.getRepository(RoomTypeFacility);

      const roomType = await roomTypeRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (roomType === null) {
        return { kind: 'not-found' };
      }

      const isInUse = await manager
        .getRepository(Room)
        .createQueryBuilder('room')
        .where('room.roomTypeId = :roomTypeId', { roomTypeId: id })
        .andWhere('room.operationalStatus != :retiredStatus', {
          retiredStatus: OperationalStatus.Retired,
        })
        .getExists();

      if (isInUse) {
        return { kind: 'in-use' };
      }

      roomType.isActive = false;

      const savedRoomType = await roomTypeRepository.save(roomType);
      const facilitiesByRoomTypeId = await this.findFacilitiesByRoomTypeIds(
        [savedRoomType.id],
        roomTypeFacilityRepository,
      );

      return {
        kind: 'deactivated',
        roomType: savedRoomType,
        facilities: facilitiesByRoomTypeId.get(savedRoomType.id) ?? [],
      };
    });
  }

  async restore(id: string): Promise<RoomTypeRestoreResult> {
    return this.dataSource.transaction(async (manager) => {
      const roomTypeRepository = manager.getRepository(RoomType);
      const facilityRepository = manager.getRepository(Facility);

      const roomType = await roomTypeRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (roomType === null) {
        return { kind: 'not-found' };
      }

      const facilities = await facilityRepository
        .createQueryBuilder('facility')
        .innerJoin(
          RoomTypeFacility,
          'roomTypeFacility',
          'roomTypeFacility.facilityId = facility.id',
        )
        .where('roomTypeFacility.roomTypeId = :roomTypeId', { roomTypeId: id })
        .orderBy('facility.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();

      const inactiveFacilityIds = facilities
        .filter((facility) => !facility.isActive)
        .map((facility) => facility.id);

      if (inactiveFacilityIds.length > 0) {
        return {
          kind: 'inactive-facilities',
          inactiveFacilityIds,
        };
      }

      if (roomType.isActive) {
        return {
          kind: 'restored',
          roomType,
          facilities,
        };
      }

      roomType.isActive = true;

      return {
        kind: 'restored',
        roomType: await roomTypeRepository.save(roomType),
        facilities,
      };
    });
  }
}
