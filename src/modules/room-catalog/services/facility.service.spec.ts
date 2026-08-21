import { ConflictException, HttpStatus, NotFoundException } from '@nestjs/common';
import { Facility } from '../entities/facility.entity';
import { FacilityRepositoryPort } from '../repositories/ports/facility-repository.port';
import { FacilityService } from './facility.service';
import { CreateFacilityDto } from '../dto/facility/create-facility.dto';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { UpdateFacilityDto } from '../dto/facility/update-facility.dto';

function createRepositoryMock(): jest.Mocked<FacilityRepositoryPort> {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findByNameInsensitive: jest.fn(),
    save: jest.fn(),
    deactivate: jest.fn(),
  };
}

function createFacility(overrides: Partial<Facility> = {}): Facility {
  return Object.assign(new Facility(), {
    id: '4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10',
    name: 'Free Wi-Fi',
    description: null,
    isActive: true,
    createdAt: new Date('2026-08-19T10:00:00.000Z'),
    updatedAt: new Date('2026-08-19T10:00:00.000Z'),
    ...overrides,
  });
}

async function getThrownError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error('Expected the promise to reject.');
}

function expectDuplicateFacilityName(error: unknown): void {
  expect(error).toBeInstanceOf(ConflictException);

  const exception = error as ConflictException;

  expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
  expect(exception.getResponse()).toEqual({
    message: 'Facility name already exists.',
    error: 'DUPLICATE_FACILITY_NAME',
  });
}

function expectFacilityNotFound(error: unknown): void {
  expect(error).toBeInstanceOf(NotFoundException);

  const exception = error as NotFoundException;

  expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
  expect(exception.getResponse()).toEqual({
    message: 'Facility not found.',
    error: 'FACILITY_NOT_FOUND',
  });
}

function expectFacilityInUse(error: unknown): void {
  expect(error).toBeInstanceOf(ConflictException);

  const exception = error as ConflictException;

  expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
  expect(exception.getResponse()).toEqual({
    message: 'Facility is assigned to an active room type.',
    error: 'FACILITY_IN_USE',
  });
}

describe('FacilityService', () => {
  let repository: jest.Mocked<FacilityRepositoryPort>;
  let service: FacilityService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new FacilityService(repository);
  });

  it('creates an active facility and maps it to a response DTO', async () => {
    const dto: CreateFacilityDto = { name: 'Free Wi-Fi' };
    const saved = createFacility();

    repository.findByNameInsensitive.mockResolvedValue(null);
    repository.save.mockResolvedValue(saved);

    await expect(service.create(dto)).resolves.toEqual({
      id: saved.id,
      name: 'Free Wi-Fi',
      description: null,
      isActive: true,
      createdAt: '2026-08-19T10:00:00.000Z',
      updatedAt: '2026-08-19T10:00:00.000Z',
    });

    expect(repository.findByNameInsensitive.mock.calls).toEqual([['Free Wi-Fi']]);
    expect(repository.save.mock.calls).toEqual([
      [
        expect.objectContaining({
          name: 'Free Wi-Fi',
          description: null,
          isActive: true,
        }),
      ],
    ]);
  });

  it('rejects an existing facility name without saving', async () => {
    repository.findByNameInsensitive.mockResolvedValue(createFacility());

    const error = await getThrownError(service.create({ name: 'free wi-fi' }));

    expectDuplicateFacilityName(error);
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('returns a paginated facility list', async () => {
    const facility = createFacility({ isActive: false });

    repository.findAll.mockResolvedValue({
      items: [facility],
      totalItems: 5,
    });

    const result = await service.list({
      page: 2,
      limit: 2,
      search: 'Wi-Fi',
      isActive: false,
    });

    expect(result).toBeInstanceOf(PaginatedResult);
    expect(result.items).toHaveLength(1);
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 2,
      totalItems: 5,
      totalPages: 3,
    });
    expect(repository.findAll.mock.calls).toEqual([
      [
        {
          page: 2,
          limit: 2,
          search: 'Wi-Fi',
          isActive: false,
        },
      ],
    ]);
  });

  it('returns an inactive facility for management detail', async () => {
    const facility = createFacility({ isActive: false });

    repository.findById.mockResolvedValue(facility);

    await expect(service.findOne(facility.id)).resolves.toEqual({
      id: facility.id,
      name: facility.name,
      description: null,
      isActive: false,
      createdAt: '2026-08-19T10:00:00.000Z',
      updatedAt: '2026-08-19T10:00:00.000Z',
    });

    expect(repository.findById.mock.calls).toEqual([[facility.id]]);
  });

  it('returns FACILITY_NOT_FOUND when the facility does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    const error = await getThrownError(service.findOne('missing-facility-id'));

    expectFacilityNotFound(error);
    expect(repository.findById.mock.calls).toEqual([['missing-facility-id']]);
  });

  it('updates a facility description', async () => {
    const facility = createFacility();
    const dto: UpdateFacilityDto = {
      description: 'Wireless internet access.',
    };

    repository.findById.mockResolvedValue(facility);
    repository.save.mockResolvedValue(facility);

    await expect(service.update(facility.id, dto)).resolves.toMatchObject({
      id: facility.id,
      description: 'Wireless internet access.',
    });

    expect(repository.findByNameInsensitive.mock.calls).toHaveLength(0);
    expect(repository.save.mock.calls).toEqual([[facility]]);
  });

  it('clears a facility description when null is supplied', async () => {
    const facility = createFacility({
      description: 'Wireless internet access.',
    });
    const dto: UpdateFacilityDto = { description: null };

    repository.findById.mockResolvedValue(facility);
    repository.save.mockResolvedValue(facility);

    await expect(service.update(facility.id, dto)).resolves.toMatchObject({
      description: null,
    });

    expect(repository.save.mock.calls).toEqual([[facility]]);
  });

  it('allows changing only the display casing of its own name', async () => {
    const facility = createFacility();
    const dto: UpdateFacilityDto = { name: 'FREE WI-FI' };

    repository.findById.mockResolvedValue(facility);
    repository.findByNameInsensitive.mockResolvedValue(facility);
    repository.save.mockResolvedValue(facility);

    await expect(service.update(facility.id, dto)).resolves.toMatchObject({
      name: 'FREE WI-FI',
    });

    expect(repository.save.mock.calls).toEqual([[facility]]);
  });

  it('rejects a name owned by another facility', async () => {
    const facility = createFacility();
    const duplicate = createFacility({
      id: 'f45d68d1-7d02-4600-8558-2b9c6e7c4f11',
      name: 'Gym',
    });

    repository.findById.mockResolvedValue(facility);
    repository.findByNameInsensitive.mockResolvedValue(duplicate);

    const error = await getThrownError(service.update(facility.id, { name: 'Gym' }));

    expectDuplicateFacilityName(error);
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('returns FACILITY_NOT_FOUND when updating a missing facility', async () => {
    repository.findById.mockResolvedValue(null);

    const error = await getThrownError(
      service.update('missing-facility-id', { description: null }),
    );

    expectFacilityNotFound(error);
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('deactivates an unused facility', async () => {
    const facility = createFacility({ isActive: false });

    repository.deactivate.mockResolvedValue({
      kind: 'deactivated',
      facility,
    });

    await expect(service.deactivate(facility.id)).resolves.toEqual({
      id: facility.id,
      name: facility.name,
      description: facility.description,
      isActive: false,
      createdAt: '2026-08-19T10:00:00.000Z',
      updatedAt: '2026-08-19T10:00:00.000Z',
    });

    expect(repository.deactivate.mock.calls).toEqual([[facility.id]]);
  });

  it('returns FACILITY_NOT_FOUND when deactivating a missing facility', async () => {
    repository.deactivate.mockResolvedValue({ kind: 'not-found' });

    const error = await getThrownError(service.deactivate('missing-facility-id'));

    expectFacilityNotFound(error);
  });

  it('returns FACILITY_IN_USE when assigned to an active room type', async () => {
    repository.deactivate.mockResolvedValue({ kind: 'in-use' });

    const error = await getThrownError(service.deactivate('facility-id'));

    expectFacilityInUse(error);
  });

  it('restores an inactive facility', async () => {
    const facility = createFacility({ isActive: false });

    repository.findById.mockResolvedValue(facility);
    repository.save.mockResolvedValue(facility);

    await expect(service.restore(facility.id)).resolves.toEqual({
      id: facility.id,
      name: facility.name,
      description: facility.description,
      isActive: true,
      createdAt: '2026-08-19T10:00:00.000Z',
      updatedAt: '2026-08-19T10:00:00.000Z',
    });

    expect(repository.findById.mock.calls).toEqual([[facility.id]]);
    expect(repository.save.mock.calls).toEqual([[facility]]);
  });

  it('returns an active facility without saving', async () => {
    const facility = createFacility({ isActive: true });

    repository.findById.mockResolvedValue(facility);

    await expect(service.restore(facility.id)).resolves.toEqual({
      id: facility.id,
      name: facility.name,
      description: facility.description,
      isActive: true,
      createdAt: '2026-08-19T10:00:00.000Z',
      updatedAt: '2026-08-19T10:00:00.000Z',
    });

    expect(repository.findById.mock.calls).toEqual([[facility.id]]);
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('returns FACILITY_NOT_FOUND when restoring a missing facility', async () => {
    repository.findById.mockResolvedValue(null);

    const error = await getThrownError(service.restore('missing-facility-id'));

    expectFacilityNotFound(error);
    expect(repository.save.mock.calls).toHaveLength(0);
  });
});
