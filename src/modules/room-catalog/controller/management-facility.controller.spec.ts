import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { FacilityResponseDto } from '../dto/facility/facility-response.dto';
import { FacilityService } from '../services/facility.service';
import { ManagementFacilityController } from './management-facility.controller';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { CreateFacilityDto } from '../dto/facility/create-facility.dto';
import { FacilityQueryDto } from '../dto/facility/facility-query.dto';
import { PaginatedResult } from 'src/common/interceptors/response.interceptor';
import { UpdateFacilityDto } from '../dto/facility/update-facility.dto';

function createResponse(overrides: Partial<FacilityResponseDto> = {}): FacilityResponseDto {
  return {
    id: '4f8c5e6b-0c4d-4df5-8dd4-2b9c6e7c4f10',
    name: 'Free Wi-Fi',
    description: null,
    isActive: true,
    createdAt: '2026-08-19T10:00:00.000Z',
    updatedAt: '2026-08-19T10:00:00.000Z',
    ...overrides,
  };
}

describe('ManagementFacilityController', () => {
  let controller: ManagementFacilityController;
  let service: jest.Mocked<
    Pick<FacilityService, 'create' | 'list' | 'findOne' | 'update' | 'deactivate' | 'restore'>
  >;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      restore: jest.fn(),
    };

    controller = new ManagementFacilityController(service as unknown as FacilityService);
  });

  it('requires Administrator or Hotel Manager roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ManagementFacilityController)).toEqual([
      AccountRole.ADMINISTRATOR,
      AccountRole.HOTEL_MANAGER,
    ]);
  });

  it('delegates facility creation to the service', async () => {
    const dto: CreateFacilityDto = {
      name: 'Free Wi-Fi',
      description: 'Wireless internet access.',
    };
    const response = createResponse({
      description: 'Wireless internet access.',
    });

    service.create.mockResolvedValue(response);

    await expect(controller.create(dto)).resolves.toBe(response);
    expect(service.create.mock.calls).toEqual([[dto]]);
  });

  it('delegates facility list queries to the service', async () => {
    const dto: FacilityQueryDto = {
      page: 2,
      limit: 5,
      search: 'Wi-Fi',
      isActive: false,
    };
    const response = new PaginatedResult([createResponse({ isActive: false })], {
      page: 2,
      pageSize: 5,
      totalItems: 6,
      totalPages: 2,
    });

    service.list.mockResolvedValue(response);

    await expect(controller.list(dto)).resolves.toBe(response);
    expect(service.list.mock.calls).toEqual([[dto]]);
  });

  it('delegates facility detail to the service', async () => {
    const response = createResponse();

    service.findOne.mockResolvedValue(response);

    await expect(controller.findOne(response.id)).resolves.toBe(response);
    expect(service.findOne.mock.calls).toEqual([[response.id]]);
  });

  it('delegates facility updates to the service', async () => {
    const dto: UpdateFacilityDto = {
      description: null,
    };
    const response = createResponse({
      description: null,
    });

    service.update.mockResolvedValue(response);

    await expect(controller.update(response.id, dto)).resolves.toBe(response);
    expect(service.update.mock.calls).toEqual([[response.id, dto]]);
  });

  it('delegates facility deactivation to the service', async () => {
    const response = createResponse({ isActive: false });

    service.deactivate.mockResolvedValue(response);

    await expect(controller.deactivate(response.id)).resolves.toBe(response);
    expect(service.deactivate.mock.calls).toEqual([[response.id]]);
  });

  it('delegates facility restore to the service', async () => {
    const response = createResponse({ isActive: true });

    service.restore.mockResolvedValue(response);

    await expect(controller.restore(response.id)).resolves.toBe(response);
    expect(service.restore.mock.calls).toEqual([[response.id]]);
  });
});
