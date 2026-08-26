import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PARAMS_PROVIDER_TOKEN } from 'nestjs-pino';
import request from 'supertest';
import type { Response } from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { SmtpEmailService } from 'src/modules/identity-access/infrastructure/adapters/smtp-email.service';
import { Facility } from 'src/modules/room-catalog/entities/facility.entity';
import { OperationalStatus } from 'src/modules/room-catalog/entities/enum/operational-status';
import { RoomTypeFacility } from 'src/modules/room-catalog/entities/room-type-facility.entity';
import { RoomType } from 'src/modules/room-catalog/entities/room-type.entity';
import { Room } from 'src/modules/room-catalog/entities/room.entity';

interface Fixture {
  facility: Facility;
  roomType: RoomType;
  room: Room;
}

type TokenMap = Record<AccountRole, string>;

const managementFacilitiesPath = '/api/v1/room-catalog/management/facilities';
const managementRoomTypesPath = '/api/v1/room-catalog/management/room-types';
const managementRoomsPath = '/api/v1/room-catalog/management/rooms';
const publicRoomTypesPath = '/api/v1/room-catalog/room-types';
const staffRoomsPath = '/api/v1/room-catalog/rooms';

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected an object response value.');
  }

  return value as Record<string, unknown>;
}

function responseBody(response: Response): Record<string, unknown> {
  const body: unknown = response.body;
  return asRecord(body);
}

function responseData(response: Response): Record<string, unknown> {
  return asRecord(responseBody(response)['data']);
}

function stringProperty(record: Record<string, unknown>, property: string): string {
  const value = record[property];

  if (typeof value !== 'string') {
    throw new Error(`Expected ${property} to be a string.`);
  }

  return value;
}

describe('Room Catalog E2E', () => {
  jest.setTimeout(60_000);

  const runKey = `RC${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
  const fixtureFacilityName = `${runKey} Wi-Fi`;
  const fixtureRoomTypeCode = `${runKey}A`;
  const fixtureRoomNumber = `${runKey}01`;

  let app: INestApplication;
  let httpServer: Server;
  let dataSource: DataSource;
  let facilityRepository: Repository<Facility>;
  let roomTypeRepository: Repository<RoomType>;
  let roomTypeFacilityRepository: Repository<RoomTypeFacility>;
  let roomRepository: Repository<Room>;
  let tokens: TokenMap;
  let fixture: Fixture;

  const authorization = (role: AccountRole): string => `Bearer ${tokens[role]}`;

  async function cleanOwnedData(): Promise<void> {
    await dataSource.query('DELETE FROM "rooms" WHERE "room_number" LIKE $1', [`${runKey}%`]);
    await dataSource.query(
      `DELETE FROM "room_type_facilities"
       WHERE "room_type_id" IN (SELECT "id" FROM "room_types" WHERE "code" LIKE $1)
          OR "facility_id" IN (SELECT "id" FROM "facilities" WHERE "name" LIKE $1)`,
      [`${runKey}%`],
    );
    await dataSource.query('DELETE FROM "room_types" WHERE "code" LIKE $1', [`${runKey}%`]);
    await dataSource.query('DELETE FROM "facilities" WHERE "name" LIKE $1', [`${runKey}%`]);
  }

  async function createFixture(): Promise<Fixture> {
    const facility = await facilityRepository.save(
      facilityRepository.create({
        name: fixtureFacilityName,
        description: 'High-speed wireless internet access.',
        isActive: true,
      }),
    );
    const roomType = await roomTypeRepository.save(
      roomTypeRepository.create({
        code: fixtureRoomTypeCode,
        name: `${runKey} Deluxe`,
        description: 'A Room Catalog E2E fixture.',
        maxOccupancy: 2,
        bedConfiguration: 'One king bed',
        displayOrder: 10,
        isActive: true,
      }),
    );

    await roomTypeFacilityRepository.save(
      roomTypeFacilityRepository.create({
        roomTypeId: roomType.id,
        facilityId: facility.id,
      }),
    );

    const room = await roomRepository.save(
      roomRepository.create({
        roomNumber: fixtureRoomNumber,
        floor: 'E2E',
        roomTypeId: roomType.id,
        operationalStatus: OperationalStatus.OutOfService,
      }),
    );

    return { facility, roomType, room };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SmtpEmailService)
      .useValue({
        sendVerificationEmail: jest.fn().mockResolvedValue({ delivered: true }),
        sendPasswordResetEmail: jest.fn().mockResolvedValue({ delivered: true }),
      })
      .overrideProvider(PARAMS_PROVIDER_TOKEN)
      .useValue({ pinoHttp: { level: 'silent' } })
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.setGlobalPrefix('api');

    dataSource = app.get(DataSource);
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await dataSource.runMigrations();
    await app.init();

    httpServer = app.getHttpServer() as Server;
    facilityRepository = dataSource.getRepository(Facility);
    roomTypeRepository = dataSource.getRepository(RoomType);
    roomTypeFacilityRepository = dataSource.getRepository(RoomTypeFacility);
    roomRepository = dataSource.getRepository(Room);

    const jwtService = app.get(JwtService);
    const createToken = (role: AccountRole): string =>
      jwtService.sign(
        { role },
        {
          subject: randomUUID(),
          expiresIn: 3600,
        },
      );

    tokens = {
      [AccountRole.ADMINISTRATOR]: createToken(AccountRole.ADMINISTRATOR),
      [AccountRole.HOTEL_MANAGER]: createToken(AccountRole.HOTEL_MANAGER),
      [AccountRole.RECEPTIONIST]: createToken(AccountRole.RECEPTIONIST),
      [AccountRole.HOUSEKEEPING_STAFF]: createToken(AccountRole.HOUSEKEEPING_STAFF),
      [AccountRole.MAINTENANCE_STAFF]: createToken(AccountRole.MAINTENANCE_STAFF),
      [AccountRole.CUSTOMER]: createToken(AccountRole.CUSTOMER),
    };
  });

  beforeEach(async () => {
    await cleanOwnedData();
    fixture = await createFixture();
  });

  afterEach(async () => {
    await cleanOwnedData();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await cleanOwnedData();
    }

    if (app) {
      await app.close();
    }
  });

  it('serves active room types publicly with the runtime response envelope', async () => {
    const listResponse = await request(httpServer)
      .get(publicRoomTypesPath)
      .query({ search: runKey, page: 1, limit: 10 })
      .expect(200);
    const listBody = responseBody(listResponse);

    expect(listBody['data']).toEqual([
      expect.objectContaining({
        id: fixture.roomType.id,
        code: fixtureRoomTypeCode,
        name: `${runKey} Deluxe`,
        maxOccupancy: 2,
        bedConfiguration: 'One king bed',
        displayOrder: 10,
      }),
    ]);
    const listMeta = asRecord(listBody['meta']);
    expect(typeof listMeta['requestId']).toBe('string');
    expect(typeof listMeta['timestamp']).toBe('string');
    expect(listMeta['pagination']).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });

    const detailResponse = await request(httpServer)
      .get(`${publicRoomTypesPath}/${fixture.roomType.id}`)
      .expect(200);
    const detail = responseData(detailResponse);

    expect(detail).toMatchObject({
      id: fixture.roomType.id,
      code: fixtureRoomTypeCode,
      description: 'A Room Catalog E2E fixture.',
      facilities: [
        {
          id: fixture.facility.id,
          name: fixtureFacilityName,
          description: 'High-speed wireless internet access.',
        },
      ],
    });
    expect(detail).not.toHaveProperty('isActive');
    expect(detail).not.toHaveProperty('createdAt');

    const invalidResponse = await request(httpServer)
      .get(publicRoomTypesPath)
      .query({ limit: 51 })
      .expect(400);

    const invalidBody = responseBody(invalidResponse);
    expect(invalidBody).toEqual(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        path: `${publicRoomTypesPath}?limit=51`,
      }),
    );
    expect(Array.isArray(invalidBody['message'])).toBe(true);
  });

  it('enforces management and staff authentication and role rules', async () => {
    await request(httpServer).get(managementFacilitiesPath).expect(401);
    await request(httpServer)
      .get(managementFacilitiesPath)
      .set('Authorization', authorization(AccountRole.RECEPTIONIST))
      .expect(403);
    await request(httpServer)
      .get(managementFacilitiesPath)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    await request(httpServer)
      .get(managementFacilitiesPath)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .expect(200);

    await request(httpServer).get(staffRoomsPath).expect(401);
    await request(httpServer)
      .get(staffRoomsPath)
      .set('Authorization', authorization(AccountRole.CUSTOMER))
      .expect(403);

    const staffRoles = [
      AccountRole.ADMINISTRATOR,
      AccountRole.HOTEL_MANAGER,
      AccountRole.RECEPTIONIST,
      AccountRole.HOUSEKEEPING_STAFF,
      AccountRole.MAINTENANCE_STAFF,
    ];

    for (const role of staffRoles) {
      await request(httpServer)
        .get(staffRoomsPath)
        .query({ search: runKey })
        .set('Authorization', authorization(role))
        .expect(200);
    }
  });

  it('runs the facility management workflow and maps validation and duplicate errors', async () => {
    const invalidResponse = await request(httpServer)
      .post(managementFacilitiesPath)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({ name: 'X', internalOnly: true })
      .expect(400);

    const invalidBody = responseBody(invalidResponse);
    expect(invalidBody).toEqual(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
      }),
    );
    expect(invalidBody['message']).toEqual(
      expect.arrayContaining(['property internalOnly should not exist']),
    );

    const facilityName = `${runKey} Spa`;
    const createResponse = await request(httpServer)
      .post(managementFacilitiesPath)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({ name: `  ${facilityName}  `, description: '  Private spa.  ' })
      .expect(201);
    const created = responseData(createResponse);
    const facilityId = stringProperty(created, 'id');

    expect(created).toMatchObject({
      name: facilityName,
      description: 'Private spa.',
      isActive: true,
    });

    const listResponse = await request(httpServer)
      .get(managementFacilitiesPath)
      .query({ search: facilityName })
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseBody(listResponse)['data']).toEqual([
      expect.objectContaining({ id: facilityId, name: facilityName }),
    ]);

    await request(httpServer)
      .get(`${managementFacilitiesPath}/${facilityId}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);

    const updateResponse = await request(httpServer)
      .patch(`${managementFacilitiesPath}/${facilityId}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({ description: null })
      .expect(200);
    expect(responseData(updateResponse)).toMatchObject({ id: facilityId, description: null });

    const duplicateResponse = await request(httpServer)
      .post(managementFacilitiesPath)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({ name: fixtureFacilityName.toLowerCase() })
      .expect(409);
    expect(responseBody(duplicateResponse)).toEqual(
      expect.objectContaining({
        statusCode: 409,
        error: 'DUPLICATE_FACILITY_NAME',
        message: ['Facility name already exists.'],
      }),
    );

    const inUseResponse = await request(httpServer)
      .delete(`${managementFacilitiesPath}/${fixture.facility.id}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(409);
    expect(responseBody(inUseResponse)).toEqual(
      expect.objectContaining({
        statusCode: 409,
        error: 'FACILITY_IN_USE',
        message: ['Facility is assigned to an active room type.'],
      }),
    );

    const deactivateResponse = await request(httpServer)
      .delete(`${managementFacilitiesPath}/${facilityId}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseData(deactivateResponse)).toMatchObject({ id: facilityId, isActive: false });

    const restoreResponse = await request(httpServer)
      .patch(`${managementFacilitiesPath}/${facilityId}/restore`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseData(restoreResponse)).toMatchObject({ id: facilityId, isActive: true });
  });

  it('runs room type queries, updates, facility assignments, and lifecycle rules', async () => {
    const listResponse = await request(httpServer)
      .get(managementRoomTypesPath)
      .query({ search: runKey })
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .expect(200);
    expect(responseBody(listResponse)['data']).toEqual([
      expect.objectContaining({ id: fixture.roomType.id, code: fixtureRoomTypeCode }),
    ]);

    await request(httpServer)
      .get(`${managementRoomTypesPath}/${fixture.roomType.id}`)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .expect(200);

    const updateResponse = await request(httpServer)
      .patch(`${managementRoomTypesPath}/${fixture.roomType.id}`)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .send({ name: `  ${runKey} Premium  `, maxOccupancy: 3 })
      .expect(200);
    expect(responseData(updateResponse)).toMatchObject({
      id: fixture.roomType.id,
      code: fixtureRoomTypeCode,
      name: `${runKey} Premium`,
      maxOccupancy: 3,
    });

    const extraFacilityResponse = await request(httpServer)
      .post(managementFacilitiesPath)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({ name: `${runKey} Balcony` })
      .expect(201);
    const extraFacilityId = stringProperty(responseData(extraFacilityResponse), 'id');

    const createdRoomTypeCode = `${runKey}B`;
    const createRoomTypeResponse = await request(httpServer)
      .post(managementRoomTypesPath)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({
        code: createdRoomTypeCode.toLowerCase(),
        name: `  ${runKey} Suite  `,
        description: '  Created through the E2E API.  ',
        maxOccupancy: 4,
        bedConfiguration: '  Two queen beds  ',
        displayOrder: 20,
        facilityIds: [extraFacilityId],
      })
      .expect(201);
    expect(responseData(createRoomTypeResponse)).toMatchObject({
      code: createdRoomTypeCode,
      name: `${runKey} Suite`,
      description: 'Created through the E2E API.',
      maxOccupancy: 4,
      bedConfiguration: 'Two queen beds',
      displayOrder: 20,
      isActive: true,
      facilities: [expect.objectContaining({ id: extraFacilityId })],
    });

    const addResponse = await request(httpServer)
      .post(`${managementRoomTypesPath}/${fixture.roomType.id}/facilities/add`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({ facilityIds: [extraFacilityId] })
      .expect(201);
    expect(responseData(addResponse)['facilities']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: fixture.facility.id }),
        expect.objectContaining({ id: extraFacilityId }),
      ]),
    );

    const removeResponse = await request(httpServer)
      .post(`${managementRoomTypesPath}/${fixture.roomType.id}/facilities/remove`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({ facilityIds: [fixture.facility.id] })
      .expect(201);
    expect(responseData(removeResponse)['facilities']).toEqual([
      expect.objectContaining({ id: extraFacilityId }),
    ]);

    const duplicateResponse = await request(httpServer)
      .post(managementRoomTypesPath)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({
        code: fixtureRoomTypeCode.toLowerCase(),
        name: 'Duplicate Room Type',
        maxOccupancy: 2,
        displayOrder: 20,
      })
      .expect(409);
    expect(responseBody(duplicateResponse)).toEqual(
      expect.objectContaining({
        statusCode: 409,
        error: 'DUPLICATE_ROOM_TYPE_CODE',
        message: ['Room type code already exists.'],
      }),
    );

    const inUseResponse = await request(httpServer)
      .delete(`${managementRoomTypesPath}/${fixture.roomType.id}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(409);
    expect(responseBody(inUseResponse)).toEqual(
      expect.objectContaining({
        statusCode: 409,
        error: 'ROOM_TYPE_IN_USE',
        message: ['Room type is assigned to a non-retired room.'],
      }),
    );

    await request(httpServer)
      .delete(`${managementRoomsPath}/${fixture.room.id}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);

    const deactivateResponse = await request(httpServer)
      .delete(`${managementRoomTypesPath}/${fixture.roomType.id}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseData(deactivateResponse)).toMatchObject({
      id: fixture.roomType.id,
      isActive: false,
    });

    const hiddenResponse = await request(httpServer)
      .get(`${publicRoomTypesPath}/${fixture.roomType.id}`)
      .expect(404);
    expect(responseBody(hiddenResponse)).toEqual(
      expect.objectContaining({
        statusCode: 404,
        error: 'ROOM_TYPE_NOT_FOUND',
      }),
    );

    const restoreResponse = await request(httpServer)
      .patch(`${managementRoomTypesPath}/${fixture.roomType.id}/restore`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseData(restoreResponse)).toMatchObject({
      id: fixture.roomType.id,
      isActive: true,
    });
  });

  it('creates and manages rooms through valid and invalid operational transitions', async () => {
    const roomNumber = `${runKey}02`;
    const invalidCreateResponse = await request(httpServer)
      .post(managementRoomsPath)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({ roomNumber, floor: 'E2E', roomTypeId: 'not-a-uuid' })
      .expect(400);
    expect(responseBody(invalidCreateResponse)).toEqual(
      expect.objectContaining({ statusCode: 400, error: 'Bad Request' }),
    );

    const createResponse = await request(httpServer)
      .post(managementRoomsPath)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({
        roomNumber: `  ${roomNumber.toLowerCase()}  `,
        floor: '  e2e  ',
        roomTypeId: fixture.roomType.id,
      })
      .expect(201);
    const created = responseData(createResponse);
    const roomId = stringProperty(created, 'id');

    expect(created).toMatchObject({
      roomNumber,
      floor: 'E2E',
      operationalStatus: OperationalStatus.OutOfService,
      roomType: { id: fixture.roomType.id, code: fixtureRoomTypeCode },
    });

    const listResponse = await request(httpServer)
      .get(managementRoomsPath)
      .query({ search: roomNumber })
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseBody(listResponse)['data']).toEqual([
      expect.objectContaining({ id: roomId, roomNumber }),
    ]);

    await request(httpServer)
      .get(`${managementRoomsPath}/${roomId}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);

    const updateResponse = await request(httpServer)
      .patch(`${managementRoomsPath}/${roomId}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({ floor: '  qa  ' })
      .expect(200);
    expect(responseData(updateResponse)).toMatchObject({ id: roomId, floor: 'QA' });

    const invalidTransitionResponse = await request(httpServer)
      .patch(`${managementRoomsPath}/${roomId}/status`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .send({ operationalStatus: OperationalStatus.Ready })
      .expect(422);
    expect(responseBody(invalidTransitionResponse)).toEqual(
      expect.objectContaining({
        statusCode: 422,
        error: 'INVALID_ROOM_STATUS_TRANSITION',
        message: ['Invalid room operational status transition.'],
      }),
    );

    for (const operationalStatus of [
      OperationalStatus.Dirty,
      OperationalStatus.Cleaning,
      OperationalStatus.Ready,
    ]) {
      const statusResponse = await request(httpServer)
        .patch(`${managementRoomsPath}/${roomId}/status`)
        .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
        .send({ operationalStatus })
        .expect(200);
      expect(responseData(statusResponse)).toMatchObject({ id: roomId, operationalStatus });
    }

    const staffListResponse = await request(httpServer)
      .get(staffRoomsPath)
      .query({ search: roomNumber })
      .set('Authorization', authorization(AccountRole.RECEPTIONIST))
      .expect(200);
    expect(responseBody(staffListResponse)['data']).toEqual([
      expect.objectContaining({ id: roomId, operationalStatus: OperationalStatus.Ready }),
    ]);

    await request(httpServer)
      .get(`${staffRoomsPath}/${roomId}`)
      .set('Authorization', authorization(AccountRole.RECEPTIONIST))
      .expect(200);

    const retireResponse = await request(httpServer)
      .delete(`${managementRoomsPath}/${roomId}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseData(retireResponse)).toMatchObject({
      id: roomId,
      operationalStatus: OperationalStatus.Retired,
    });

    await request(httpServer)
      .get(`${staffRoomsPath}/${roomId}`)
      .set('Authorization', authorization(AccountRole.RECEPTIONIST))
      .expect(404);

    const retiredDetailResponse = await request(httpServer)
      .get(`${managementRoomsPath}/${roomId}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseData(retiredDetailResponse)).toMatchObject({
      id: roomId,
      operationalStatus: OperationalStatus.Retired,
    });

    const restoreResponse = await request(httpServer)
      .patch(`${managementRoomsPath}/${roomId}/restore`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseData(restoreResponse)).toMatchObject({
      id: roomId,
      operationalStatus: OperationalStatus.OutOfService,
    });

    await request(httpServer)
      .get(`${staffRoomsPath}/${roomId}`)
      .set('Authorization', authorization(AccountRole.RECEPTIONIST))
      .expect(200);
  });
});
