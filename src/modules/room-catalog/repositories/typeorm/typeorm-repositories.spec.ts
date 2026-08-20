import { DataSource, EntityManager, FindOperator, ObjectLiteral, Repository } from 'typeorm';
import { Facility } from '../../entities/facility.entity';
import { RoomType } from '../../entities/room-type.entity';
import { Room } from '../../entities/room.entity';
import { TypeOrmFacilityRepository } from './typeorm-facility.repository';
import { TypeOrmRoomTypeRepository } from './typeorm-room-type.repository';
import { TypeOrmRoomRepository } from './typeorm-room.repository';
import { RoomTypeFacility } from '../../entities/room-type-facility.entity';

type RepositoryMock<T extends ObjectLiteral> = {
  findOneBy: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  findAndCount: jest.Mock;
} & Partial<Repository<T>>;

function createRepositoryMock<T extends ObjectLiteral>(): RepositoryMock<T> {
  return {
    findOneBy: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  };
}

describe('TypeOrmFacilityRepository', () => {
  it('delegates findById, findAll, findOne, and save', async () => {
    const repository = createRepositoryMock<Facility>();
    const adapter = new TypeOrmFacilityRepository(
      repository as Repository<Facility>,
      {} as unknown as DataSource,
    );
    const facility = new Facility();
    repository.findOneBy.mockResolvedValue(facility);
    repository.save.mockResolvedValue(facility);
    repository.findOne.mockResolvedValue(facility);
    repository.findAndCount.mockResolvedValue([[facility], 1]);

    const options = {
      page: 1,
      limit: 10,
      search: 'free',
      isActive: false,
    };

    await expect(adapter.findById('facility-id')).resolves.toBe(facility);
    await expect(adapter.findAll(options)).resolves.toEqual({
      items: [facility],
      totalItems: 1,
    });
    await expect(adapter.save(facility)).resolves.toBe(facility);
    await expect(adapter.findByNameInsensitive('Wi-fi')).resolves.toBe(facility);

    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'facility-id' });
    expect(repository.save).toHaveBeenCalledWith(facility);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        name: expect.any(FindOperator) as unknown,
      },
    });
    expect(repository.findAndCount).toHaveBeenCalledWith({
      where: {
        name: expect.any(FindOperator) as unknown,
        isActive: false,
      },
      order: { name: 'ASC', id: 'ASC' },
      skip: 0,
      take: 10,
    });
  });

  it('locks and deactivates an unused facility in a transaction', async () => {
    const readRepository = createRepositoryMock<Facility>();
    const transactionFacilityRepository = createRepositoryMock<Facility>();
    const facility = Object.assign(new Facility(), {
      id: '4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10',
      isActive: true,
    });

    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getExists: jest.fn().mockResolvedValue(false),
    };

    const associationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<RoomTypeFacility>;

    const getRepository = jest.fn();
    const transactionManager = {
      getRepository,
    } as unknown as EntityManager;

    getRepository.mockImplementation((entityTarget: unknown) => {
      if (entityTarget === Facility) {
        return transactionFacilityRepository;
      }

      if (entityTarget === RoomTypeFacility) {
        return associationRepository;
      }

      throw new Error('Unexpected repository request.');
    });

    const transaction = jest.fn(async (work: (manager: EntityManager) => Promise<unknown>) =>
      work(transactionManager),
    );
    const dataSource = { transaction } as unknown as DataSource;

    transactionFacilityRepository.findOne.mockResolvedValue(facility);
    transactionFacilityRepository.save.mockResolvedValue(facility);

    const adapter = new TypeOrmFacilityRepository(
      readRepository as Repository<Facility>,
      dataSource,
    );

    await expect(adapter.deactivate(facility.id)).resolves.toEqual({
      kind: 'deactivated',
      facility,
    });

    expect(transactionFacilityRepository.findOne).toHaveBeenCalledWith({
      where: { id: facility.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(queryBuilder.innerJoin).toHaveBeenCalledWith('roomTypeFacility.roomType', 'roomType');
    expect(queryBuilder.where).toHaveBeenCalledWith('roomTypeFacility.facilityId = :facilityId', {
      facilityId: facility.id,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('roomType.isActive = :isActive', {
      isActive: true,
    });
    expect(transactionFacilityRepository.save).toHaveBeenCalledWith(facility);
  });
});

describe('TypeOrmRoomTypeRepository', () => {
  it('delegates findById, findAll, and save', async () => {
    const repository = createRepositoryMock<RoomType>();
    const adapter = new TypeOrmRoomTypeRepository(repository as Repository<RoomType>);
    const roomType = new RoomType();
    repository.findOneBy.mockResolvedValue(roomType);
    repository.find.mockResolvedValue([roomType]);
    repository.save.mockResolvedValue(roomType);

    await expect(adapter.findById('room-type-id')).resolves.toBe(roomType);
    await expect(adapter.findAll()).resolves.toEqual([roomType]);
    await expect(adapter.save(roomType)).resolves.toBe(roomType);

    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'room-type-id' });
    expect(repository.find).toHaveBeenCalledWith({
      order: { displayOrder: 'ASC', code: 'ASC', id: 'ASC' },
    });
    expect(repository.save).toHaveBeenCalledWith(roomType);
  });
});

describe('TypeOrmRoomRepository', () => {
  it('delegates findById, findAll, and save', async () => {
    const repository = createRepositoryMock<Room>();
    const adapter = new TypeOrmRoomRepository(repository as Repository<Room>);
    const room = new Room();
    repository.findOneBy.mockResolvedValue(room);
    repository.find.mockResolvedValue([room]);
    repository.save.mockResolvedValue(room);

    await expect(adapter.findById('room-id')).resolves.toBe(room);
    await expect(adapter.findAll()).resolves.toEqual([room]);
    await expect(adapter.save(room)).resolves.toBe(room);

    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'room-id' });
    expect(repository.find).toHaveBeenCalledWith({
      order: { roomNumber: 'ASC' },
    });
    expect(repository.save).toHaveBeenCalledWith(room);
  });
});
