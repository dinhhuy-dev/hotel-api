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
import {
  PRICING_QUOTE_SERVICE,
  PricingQuoteContract,
} from 'src/modules/pricing/contracts/pricing-quote.contract';
import { RoomRate } from 'src/modules/pricing/entities/room-rate.entity';
import { RoomType } from 'src/modules/room-catalog/entities/room-type.entity';

interface Fixture {
  activeRoomType: RoomType;
  unpricedRoomType: RoomType;
  inactiveRoomType: RoomType;
}

type TokenMap = Record<AccountRole, string>;

const millisecondsPerDay = 24 * 60 * 60 * 1000;
const roomRatesPath = '/api/v1/pricing/management/room-rates';

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

function responseDataArray(response: Response): Record<string, unknown>[] {
  const data = responseBody(response)['data'];

  if (!Array.isArray(data)) {
    throw new Error('Expected response data to be an array.');
  }

  return data.map(asRecord);
}

function stringProperty(record: Record<string, unknown>, property: string): string {
  const value = record[property];

  if (typeof value !== 'string') {
    throw new Error(`Expected ${property} to be a string.`);
  }

  return value;
}

function hotelToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

function addDays(date: string, dayCount: number): string {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`) + dayCount * millisecondsPerDay;

  return new Date(timestamp).toISOString().slice(0, 10);
}

describe('Pricing E2E', () => {
  jest.setTimeout(60_000);

  const runKey = `PR${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
  const activeRoomTypeCode = `${runKey}A`;
  const unpricedRoomTypeCode = `${runKey}B`;
  const inactiveRoomTypeCode = `${runKey}C`;

  let app: INestApplication;
  let httpServer: Server;
  let dataSource: DataSource;
  let roomRateRepository: Repository<RoomRate>;
  let roomTypeRepository: Repository<RoomType>;
  let pricingQuoteService: PricingQuoteContract;
  let tokens: TokenMap;
  let fixture: Fixture;
  let currentDate: string;
  let rangeStart: string;

  const authorization = (role: AccountRole): string => `Bearer ${tokens[role]}`;

  async function cleanOwnedData(): Promise<void> {
    await dataSource.query(
      `DELETE FROM "room_rates"
       WHERE "room_type_id" IN (SELECT "id" FROM "room_types" WHERE "code" LIKE $1)`,
      [`${runKey}%`],
    );
    await dataSource.query('DELETE FROM "room_types" WHERE "code" LIKE $1', [`${runKey}%`]);
  }

  async function createFixture(): Promise<Fixture> {
    const roomTypes = await roomTypeRepository.save([
      roomTypeRepository.create({
        code: activeRoomTypeCode,
        name: `${runKey} Active Room Type`,
        description: 'An active Pricing E2E Room Type.',
        maxOccupancy: 2,
        bedConfiguration: 'One king bed',
        displayOrder: 10,
        isActive: true,
      }),
      roomTypeRepository.create({
        code: unpricedRoomTypeCode,
        name: `${runKey} Unpriced Room Type`,
        description: 'An unpriced Pricing E2E Room Type.',
        maxOccupancy: 2,
        bedConfiguration: 'Two single beds',
        displayOrder: 20,
        isActive: true,
      }),
      roomTypeRepository.create({
        code: inactiveRoomTypeCode,
        name: `${runKey} Inactive Room Type`,
        description: 'An inactive Pricing E2E Room Type.',
        maxOccupancy: 2,
        bedConfiguration: 'One queen bed',
        displayOrder: 30,
        isActive: false,
      }),
    ]);

    return {
      activeRoomType: roomTypes[0],
      unpricedRoomType: roomTypes[1],
      inactiveRoomType: roomTypes[2],
    };
  }

  async function createRoomRate(
    startDate: string,
    endDate: string,
    pricePerNight: number,
    roomTypeId = fixture.activeRoomType.id,
  ): Promise<Record<string, unknown>> {
    const response = await request(httpServer)
      .post(roomRatesPath)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .send({ roomTypeId, startDate, endDate, pricePerNight })
      .expect(201);

    return responseData(response);
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
    roomRateRepository = dataSource.getRepository(RoomRate);
    roomTypeRepository = dataSource.getRepository(RoomType);
    pricingQuoteService = app.get<PricingQuoteContract>(PRICING_QUOTE_SERVICE);

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
    currentDate = hotelToday();
    rangeStart = addDays(currentDate, 30);
    await cleanOwnedData();
    fixture = await createFixture();
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await cleanOwnedData();
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await cleanOwnedData();
    }

    if (app) {
      await app.close();
    }
  });

  it('enforces authentication, management roles, and runtime validation', async () => {
    await request(httpServer).get(roomRatesPath).expect(401);
    await request(httpServer)
      .get(roomRatesPath)
      .set('Authorization', authorization(AccountRole.CUSTOMER))
      .expect(403);
    await request(httpServer)
      .get(roomRatesPath)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    await request(httpServer)
      .get(roomRatesPath)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .expect(200);

    await request(httpServer)
      .post(roomRatesPath)
      .set('Authorization', authorization(AccountRole.RECEPTIONIST))
      .send({
        roomTypeId: fixture.activeRoomType.id,
        startDate: rangeStart,
        endDate: addDays(rangeStart, 2),
        pricePerNight: 500000,
      })
      .expect(403);

    const invalidCreateResponse = await request(httpServer)
      .post(roomRatesPath)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .send({
        roomTypeId: fixture.activeRoomType.id,
        startDate: rangeStart,
        endDate: addDays(rangeStart, 2),
        pricePerNight: 500000,
        internalOnly: true,
      })
      .expect(400);
    expect(responseBody(invalidCreateResponse)).toEqual(
      expect.objectContaining({ statusCode: 400, error: 'Bad Request' }),
    );
    expect(responseBody(invalidCreateResponse)['message']).toEqual(
      expect.arrayContaining(['property internalOnly should not exist']),
    );

    await request(httpServer)
      .get(roomRatesPath)
      .query({ limit: 51 })
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .expect(400);
    await request(httpServer)
      .get(`${roomRatesPath}/not-a-uuid`)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .expect(400);
  });

  it('creates and reads a persisted rate with stable domain failures', async () => {
    const endDate = addDays(rangeStart, 3);
    const created = await createRoomRate(rangeStart, endDate, 500000);
    const roomRateId = stringProperty(created, 'id');

    expect(created).toMatchObject({
      roomTypeId: fixture.activeRoomType.id,
      startDate: rangeStart,
      endDate,
      pricePerNight: 500000,
    });
    expect(typeof created['createdAt']).toBe('string');
    expect(typeof created['updatedAt']).toBe('string');
    await expect(roomRateRepository.findOneBy({ id: roomRateId })).resolves.toMatchObject({
      id: roomRateId,
      roomTypeId: fixture.activeRoomType.id,
      startDate: rangeStart,
      endDate,
      pricePerNight: 500000,
    });

    const detailResponse = await request(httpServer)
      .get(`${roomRatesPath}/${roomRateId}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseData(detailResponse)).toEqual(created);

    const overlapResponse = await request(httpServer)
      .post(roomRatesPath)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .send({
        roomTypeId: fixture.activeRoomType.id,
        startDate: addDays(rangeStart, 1),
        endDate: addDays(rangeStart, 4),
        pricePerNight: 600000,
      })
      .expect(409);
    expect(responseBody(overlapResponse)).toEqual(
      expect.objectContaining({ statusCode: 409, error: 'ROOM_RATE_OVERLAP' }),
    );

    const inactiveResponse = await request(httpServer)
      .post(roomRatesPath)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .send({
        roomTypeId: fixture.inactiveRoomType.id,
        startDate: rangeStart,
        endDate,
        pricePerNight: 500000,
      })
      .expect(409);
    expect(responseBody(inactiveResponse)).toEqual(
      expect.objectContaining({ statusCode: 409, error: 'INACTIVE_ROOM_TYPE' }),
    );

    const missingRoomTypeResponse = await request(httpServer)
      .post(roomRatesPath)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .send({
        roomTypeId: randomUUID(),
        startDate: rangeStart,
        endDate,
        pricePerNight: 500000,
      })
      .expect(404);
    expect(responseBody(missingRoomTypeResponse)).toEqual(
      expect.objectContaining({ statusCode: 404, error: 'ROOM_TYPE_NOT_FOUND' }),
    );
  });

  it('returns every complete stored rate that overlaps the filter window', async () => {
    const firstEnd = addDays(rangeStart, 2);
    const secondEnd = addDays(rangeStart, 5);
    const thirdEnd = addDays(rangeStart, 7);
    const first = await createRoomRate(rangeStart, firstEnd, 100000);
    const second = await createRoomRate(firstEnd, secondEnd, 200000);
    const third = await createRoomRate(secondEnd, thirdEnd, 300000);

    const listResponse = await request(httpServer)
      .get(roomRatesPath)
      .query({
        roomTypeId: fixture.activeRoomType.id,
        fromDate: addDays(rangeStart, 1),
        toDate: addDays(rangeStart, 6),
        page: 1,
        limit: 10,
      })
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .expect(200);

    expect(responseDataArray(listResponse)).toEqual([
      expect.objectContaining({
        id: third['id'],
        startDate: secondEnd,
        endDate: thirdEnd,
        pricePerNight: 300000,
      }),
      expect.objectContaining({
        id: second['id'],
        startDate: firstEnd,
        endDate: secondEnd,
        pricePerNight: 200000,
      }),
      expect.objectContaining({
        id: first['id'],
        startDate: rangeStart,
        endDate: firstEnd,
        pricePerNight: 100000,
      }),
    ]);
    expect(asRecord(responseBody(listResponse)['meta'])['pagination']).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 3,
      totalPages: 1,
    });

    const secondPageResponse = await request(httpServer)
      .get(roomRatesPath)
      .query({ roomTypeId: fixture.activeRoomType.id, page: 2, limit: 2 })
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseDataArray(secondPageResponse)).toEqual([
      expect.objectContaining({ id: first['id'] }),
    ]);
    expect(asRecord(responseBody(secondPageResponse)['meta'])['pagination']).toEqual({
      page: 2,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
    });

    const invalidFilterResponse = await request(httpServer)
      .get(roomRatesPath)
      .query({ fromDate: rangeStart })
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .expect(400);
    expect(responseBody(invalidFilterResponse)).toEqual(
      expect.objectContaining({ statusCode: 400, error: 'INVALID_ROOM_RATE_RANGE' }),
    );
  });

  it('updates and deletes future rates while protecting started rates', async () => {
    const originalEndDate = addDays(rangeStart, 3);
    const updatedEndDate = addDays(rangeStart, 4);
    const created = await createRoomRate(rangeStart, originalEndDate, 400000);
    const roomRateId = stringProperty(created, 'id');

    const updateResponse = await request(httpServer)
      .patch(`${roomRatesPath}/${roomRateId}`)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .send({ endDate: updatedEndDate, pricePerNight: 450000 })
      .expect(200);
    expect(responseData(updateResponse)).toMatchObject({
      id: roomRateId,
      roomTypeId: fixture.activeRoomType.id,
      startDate: rangeStart,
      endDate: updatedEndDate,
      pricePerNight: 450000,
    });
    await expect(roomRateRepository.findOneBy({ id: roomRateId })).resolves.toMatchObject({
      endDate: updatedEndDate,
      pricePerNight: 450000,
    });

    const emptyUpdateResponse = await request(httpServer)
      .patch(`${roomRatesPath}/${roomRateId}`)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .send({})
      .expect(400);
    expect(responseBody(emptyUpdateResponse)).toEqual(
      expect.objectContaining({ statusCode: 400, error: 'INVALID_ROOM_RATE_UPDATE' }),
    );

    const startedRate = await roomRateRepository.save(
      roomRateRepository.create({
        roomTypeId: fixture.unpricedRoomType.id,
        startDate: currentDate,
        endDate: addDays(currentDate, 1),
        pricePerNight: 350000,
      }),
    );

    const startedUpdateResponse = await request(httpServer)
      .patch(`${roomRatesPath}/${startedRate.id}`)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .send({ pricePerNight: 360000 })
      .expect(409);
    expect(responseBody(startedUpdateResponse)).toEqual(
      expect.objectContaining({ statusCode: 409, error: 'ROOM_RATE_ALREADY_STARTED' }),
    );

    const startedDeleteResponse = await request(httpServer)
      .delete(`${roomRatesPath}/${startedRate.id}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(409);
    expect(responseBody(startedDeleteResponse)).toEqual(
      expect.objectContaining({ statusCode: 409, error: 'ROOM_RATE_ALREADY_STARTED' }),
    );

    const deleteResponse = await request(httpServer)
      .delete(`${roomRatesPath}/${roomRateId}`)
      .set('Authorization', authorization(AccountRole.ADMINISTRATOR))
      .expect(200);
    expect(responseBody(deleteResponse)['data']).toBeNull();
    await expect(roomRateRepository.findOneBy({ id: roomRateId })).resolves.toBeNull();

    const missingResponse = await request(httpServer)
      .get(`${roomRatesPath}/${roomRateId}`)
      .set('Authorization', authorization(AccountRole.HOTEL_MANAGER))
      .expect(404);
    expect(responseBody(missingResponse)).toEqual(
      expect.objectContaining({ statusCode: 404, error: 'ROOM_RATE_NOT_FOUND' }),
    );
  });

  it('quotes all applied ranges and enforces the PostgreSQL exclusion constraint', async () => {
    const firstEnd = addDays(rangeStart, 2);
    const secondEnd = addDays(rangeStart, 5);
    const thirdEnd = addDays(rangeStart, 7);
    const first = await createRoomRate(rangeStart, firstEnd, 100000);
    const second = await createRoomRate(firstEnd, secondEnd, 200000);
    const third = await createRoomRate(secondEnd, thirdEnd, 300000);

    await expect(
      pricingQuoteService.quote({
        roomTypeIds: [fixture.activeRoomType.id, fixture.unpricedRoomType.id],
        checkInDate: addDays(rangeStart, 1),
        checkOutDate: addDays(rangeStart, 6),
      }),
    ).resolves.toEqual({
      quotes: [
        {
          roomTypeId: fixture.activeRoomType.id,
          pricePerRoomStay: 1000000,
          appliedRates: [
            {
              roomRateId: first['id'],
              rateStartDate: rangeStart,
              rateEndDate: firstEnd,
              appliedStartDate: addDays(rangeStart, 1),
              appliedEndDate: firstEnd,
              pricePerNight: 100000,
              nightCount: 1,
              subtotal: 100000,
            },
            {
              roomRateId: second['id'],
              rateStartDate: firstEnd,
              rateEndDate: secondEnd,
              appliedStartDate: firstEnd,
              appliedEndDate: secondEnd,
              pricePerNight: 200000,
              nightCount: 3,
              subtotal: 600000,
            },
            {
              roomRateId: third['id'],
              rateStartDate: secondEnd,
              rateEndDate: thirdEnd,
              appliedStartDate: secondEnd,
              appliedEndDate: addDays(rangeStart, 6),
              pricePerNight: 300000,
              nightCount: 1,
              subtotal: 300000,
            },
          ],
        },
      ],
      unquotedRoomTypeIds: [fixture.unpricedRoomType.id],
    });

    await expect(
      roomRateRepository.save(
        roomRateRepository.create({
          roomTypeId: fixture.activeRoomType.id,
          startDate: addDays(rangeStart, 1),
          endDate: addDays(rangeStart, 3),
          pricePerNight: 900000,
        }),
      ),
    ).rejects.toMatchObject({
      driverError: { constraint: 'ex_room_rates_no_overlap' },
    });
  });
});
