import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PARAMS_PROVIDER_TOKEN } from 'nestjs-pino';
import request from 'supertest';
import type { Response } from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import type {
  EmailServicePort,
  PasswordResetEmailInput,
  VerificationEmailInput,
} from 'src/modules/identity-access/application/ports/outbound/email-service.port';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { AccountStatus } from 'src/modules/identity-access/domain/enums/account-status';
import { AccountTokenType } from 'src/modules/identity-access/domain/enums/account-token-type';
import { SmtpEmailService } from 'src/modules/identity-access/infrastructure/adapters/smtp-email.service';
import { AccountOrmEntity } from 'src/modules/identity-access/infrastructure/typeorm/entities/account.orm.entity';
import { AccountTokenOrmEntity } from 'src/modules/identity-access/infrastructure/typeorm/entities/account-token.orm.entity';

interface AuthenticationTokens {
  accessToken: string;
  refreshToken: string;
}

const authenticationPath = '/api/v1/auth';

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

function authenticationTokens(response: Response): AuthenticationTokens {
  const data = responseData(response);

  return {
    accessToken: stringProperty(data, 'accessToken'),
    refreshToken: stringProperty(data, 'refreshToken'),
  };
}

describe('Identity Access E2E', () => {
  jest.setTimeout(120_000);

  const runKey = randomUUID().replaceAll('-', '').slice(0, 12).toLowerCase();
  const emailPrefix = `ia.${runKey}.`;
  const originalPassword = 'Original123!';
  const changedPassword = 'Changed123!';

  const verificationEmails: VerificationEmailInput[] = [];
  const passwordResetEmails: PasswordResetEmailInput[] = [];
  const emailService: EmailServicePort = {
    sendVerificationEmail(input) {
      verificationEmails.push(input);
      return Promise.resolve({ delivered: true });
    },
    sendPasswordResetEmail(input) {
      passwordResetEmails.push(input);
      return Promise.resolve({ delivered: true });
    },
  };

  let app: INestApplication;
  let httpServer: Server;
  let dataSource: DataSource;
  let accountRepository: Repository<AccountOrmEntity>;
  let accountTokenRepository: Repository<AccountTokenOrmEntity>;

  const ownedEmail = (label: string): string => `${emailPrefix}${label}@hotel.test`;

  async function cleanOwnedData(): Promise<void> {
    await dataSource.query('DELETE FROM "accounts" WHERE "email" LIKE $1', [`${emailPrefix}%`]);
  }

  function verificationTokenFor(email: string): string {
    const input = verificationEmails.find((candidate) => candidate.email === email.toLowerCase());

    if (!input) {
      throw new Error(`No verification email was captured for ${email}.`);
    }

    return input.token;
  }

  function passwordResetTokenFor(email: string): string {
    const input = passwordResetEmails.find((candidate) => candidate.email === email.toLowerCase());

    if (!input) {
      throw new Error(`No password reset email was captured for ${email}.`);
    }

    return input.token;
  }

  async function signUp(email: string, password = originalPassword): Promise<string> {
    const response = await request(httpServer)
      .post(`${authenticationPath}/sign-up`)
      .send({ email, password })
      .expect(201);
    const data = responseData(response);

    expect(data['verificationEmailSent']).toBe(true);
    return stringProperty(data, 'accountId');
  }

  async function activateAccount(
    email: string,
    role = AccountRole.CUSTOMER,
  ): Promise<AuthenticationTokens> {
    await signUp(email);

    if (role !== AccountRole.CUSTOMER) {
      await accountRepository.update(
        { email: email.toLowerCase() },
        { role, updatedAt: new Date() },
      );
    }

    const response = await request(httpServer)
      .get(`${authenticationPath}/verify-email`)
      .query({ token: verificationTokenFor(email) })
      .expect(200);

    expect(responseData(response)).toMatchObject({ alreadyVerified: false });
    return authenticationTokens(response);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SmtpEmailService)
      .useValue(emailService)
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
    accountRepository = dataSource.getRepository(AccountOrmEntity);
    accountTokenRepository = dataSource.getRepository(AccountTokenOrmEntity);
  });

  beforeEach(async () => {
    verificationEmails.length = 0;
    passwordResetEmails.length = 0;
    await cleanOwnedData();
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

  it('enforces runtime validation, authentication, and change-password RBAC', async () => {
    const invalidResponse = await request(httpServer)
      .post(`${authenticationPath}/sign-up`)
      .send({
        email: ownedEmail('invalid'),
        password: 'short',
        internalOnly: true,
      })
      .expect(400);

    expect(responseBody(invalidResponse)).toEqual(
      expect.objectContaining({ statusCode: 400, error: 'Bad Request' }),
    );
    expect(responseBody(invalidResponse)['message']).toEqual(
      expect.arrayContaining([
        'password must be longer than or equal to 8 characters',
        'property internalOnly should not exist',
      ]),
    );

    await request(httpServer).get(`${authenticationPath}/verify-email`).expect(400);
    await request(httpServer)
      .post(`${authenticationPath}/change-password`)
      .send({ currentPassword: originalPassword, newPassword: changedPassword })
      .expect(401);

    const customerTokens = await activateAccount(ownedEmail('customer-role'));

    await request(httpServer)
      .post(`${authenticationPath}/change-password`)
      .set('Authorization', `Bearer ${customerTokens.accessToken}`)
      .send({ currentPassword: originalPassword, newPassword: changedPassword })
      .expect(200);
  });

  it('persists normalized sign-up data and completes email verification and sign-in', async () => {
    const email = ownedEmail('lifecycle').toUpperCase();
    const normalizedEmail = email.toLowerCase();
    const accountId = await signUp(email);

    await expect(accountRepository.findOneBy({ id: accountId })).resolves.toMatchObject({
      id: accountId,
      email: normalizedEmail,
      role: AccountRole.CUSTOMER,
      status: AccountStatus.PENDING_VERIFICATION,
      emailVerifiedAt: null,
      refreshTokenHash: null,
    });

    const pendingAccount = await accountRepository.findOneByOrFail({ id: accountId });
    expect(pendingAccount.passwordHash).not.toBe(originalPassword);

    const verificationToken = verificationTokenFor(normalizedEmail);
    const storedVerificationToken = await accountTokenRepository.findOneOrFail({
      where: {
        account: { id: accountId },
        type: AccountTokenType.EMAIL_VERIFICATION,
      },
    });
    expect(storedVerificationToken.tokenHash).not.toBe(verificationToken);
    expect(storedVerificationToken.usedAt).toBeNull();

    const pendingSignInResponse = await request(httpServer)
      .post(`${authenticationPath}/sign-in`)
      .send({ email, password: originalPassword })
      .expect(500);
    expect(responseBody(pendingSignInResponse)).toEqual(
      expect.objectContaining({ statusCode: 500, error: 'AccountNotActiveError' }),
    );

    const verifyResponse = await request(httpServer)
      .get(`${authenticationPath}/verify-email`)
      .query({ token: verificationToken })
      .expect(200);
    const verificationAuthentication = authenticationTokens(verifyResponse);
    expect(responseData(verifyResponse)).toMatchObject({
      accountId,
      alreadyVerified: false,
    });

    const activeAccount = await accountRepository.findOneByOrFail({ id: accountId });
    expect(activeAccount).toMatchObject({
      status: AccountStatus.ACTIVE,
      role: AccountRole.CUSTOMER,
    });
    expect(activeAccount.emailVerifiedAt).toBeInstanceOf(Date);
    expect(activeAccount.refreshTokenHash).not.toBe(verificationAuthentication.refreshToken);
    const usedVerificationToken = await accountTokenRepository.findOneByOrFail({
      id: storedVerificationToken.id,
    });
    expect(usedVerificationToken.usedAt).toBeInstanceOf(Date);

    const repeatedVerificationResponse = await request(httpServer)
      .get(`${authenticationPath}/verify-email`)
      .query({ token: verificationToken })
      .expect(200);
    expect(responseData(repeatedVerificationResponse)).toEqual({
      accountId,
      alreadyVerified: true,
    });

    const signInResponse = await request(httpServer)
      .post(`${authenticationPath}/sign-in`)
      .send({ email, password: originalPassword })
      .expect(201);
    const signedIn = authenticationTokens(signInResponse);
    expect(signedIn.accessToken.split('.')).toHaveLength(3);
    expect(signedIn.refreshToken).not.toBe(verificationAuthentication.refreshToken);
  });

  it('rotates refresh tokens and makes logout idempotent', async () => {
    const email = ownedEmail('refresh-logout');
    const initialTokens = await activateAccount(email);

    const refreshResponse = await request(httpServer)
      .post(`${authenticationPath}/refresh`)
      .send({ token: initialTokens.refreshToken })
      .expect(201);
    const rotatedTokens = authenticationTokens(refreshResponse);
    expect(rotatedTokens.refreshToken).not.toBe(initialTokens.refreshToken);

    const reusedRefreshResponse = await request(httpServer)
      .post(`${authenticationPath}/refresh`)
      .send({ token: initialTokens.refreshToken })
      .expect(500);
    expect(responseBody(reusedRefreshResponse)).toEqual(
      expect.objectContaining({ statusCode: 500, error: 'InvalidRefreshTokenError' }),
    );

    const logoutResponse = await request(httpServer)
      .post(`${authenticationPath}/logout`)
      .send({ token: rotatedTokens.refreshToken })
      .expect(200);
    expect(responseBody(logoutResponse)['data']).toBeNull();

    const account = await accountRepository.findOneByOrFail({ email });
    expect(account.refreshTokenHash).toBeNull();
    expect(account.refreshTokenExpiresAt).toBeNull();

    await request(httpServer)
      .post(`${authenticationPath}/refresh`)
      .send({ token: rotatedTokens.refreshToken })
      .expect(500);
    await request(httpServer)
      .post(`${authenticationPath}/logout`)
      .send({ token: rotatedTokens.refreshToken })
      .expect(200);
  });

  it('keeps password recovery enumeration-safe and consumes reset tokens once', async () => {
    const email = ownedEmail('password-reset');
    const initialTokens = await activateAccount(email);

    const unknownResponse = await request(httpServer)
      .post(`${authenticationPath}/forgot-password`)
      .send({ email: ownedEmail('unknown') })
      .expect(202);
    expect(responseData(unknownResponse)).toEqual({
      message: 'We will send a link to reset your password if your account exists.',
    });
    expect(passwordResetEmails).toHaveLength(0);

    const knownResponse = await request(httpServer)
      .post(`${authenticationPath}/forgot-password`)
      .send({ email })
      .expect(202);
    expect(responseData(knownResponse)).toEqual(responseData(unknownResponse));
    expect(passwordResetEmails).toHaveLength(1);

    const resetToken = passwordResetTokenFor(email);
    const resetResponse = await request(httpServer)
      .post(`${authenticationPath}/reset-password`)
      .send({ token: resetToken, newPassword: changedPassword })
      .expect(200);
    expect(responseBody(resetResponse)['data']).toBeNull();

    const storedResetToken = await accountTokenRepository.findOneOrFail({
      where: {
        account: { email },
        type: AccountTokenType.PASSWORD_RESET,
      },
    });
    expect(storedResetToken.usedAt).toBeInstanceOf(Date);

    await request(httpServer)
      .post(`${authenticationPath}/sign-in`)
      .send({ email, password: originalPassword })
      .expect(500);
    await request(httpServer)
      .post(`${authenticationPath}/sign-in`)
      .send({ email, password: changedPassword })
      .expect(201);
    await request(httpServer)
      .post(`${authenticationPath}/refresh`)
      .send({ token: initialTokens.refreshToken })
      .expect(500);

    const reusedResetResponse = await request(httpServer)
      .post(`${authenticationPath}/reset-password`)
      .send({ token: resetToken, newPassword: originalPassword })
      .expect(500);
    expect(responseBody(reusedResetResponse)).toEqual(
      expect.objectContaining({ statusCode: 500, error: 'InvalidAccountTokenError' }),
    );
  });

  it('changes an administrator password and revokes the active refresh token', async () => {
    const email = ownedEmail('change-password');
    const initialTokens = await activateAccount(email, AccountRole.ADMINISTRATOR);

    const changeResponse = await request(httpServer)
      .post(`${authenticationPath}/change-password`)
      .set('Authorization', `Bearer ${initialTokens.accessToken}`)
      .send({ currentPassword: originalPassword, newPassword: changedPassword })
      .expect(200);
    expect(responseBody(changeResponse)['data']).toBeNull();

    const account = await accountRepository.findOneByOrFail({ email });
    expect(account.role).toBe(AccountRole.ADMINISTRATOR);
    expect(account.refreshTokenHash).toBeNull();
    expect(account.refreshTokenExpiresAt).toBeNull();

    await request(httpServer)
      .post(`${authenticationPath}/refresh`)
      .send({ token: initialTokens.refreshToken })
      .expect(500);
    await request(httpServer)
      .post(`${authenticationPath}/sign-in`)
      .send({ email, password: originalPassword })
      .expect(500);

    const signInResponse = await request(httpServer)
      .post(`${authenticationPath}/sign-in`)
      .send({ email, password: changedPassword })
      .expect(201);
    const currentTokens = authenticationTokens(signInResponse);

    const wrongPasswordResponse = await request(httpServer)
      .post(`${authenticationPath}/change-password`)
      .set('Authorization', `Bearer ${currentTokens.accessToken}`)
      .send({ currentPassword: originalPassword, newPassword: 'Another123!' })
      .expect(500);
    expect(responseBody(wrongPasswordResponse)).toEqual(
      expect.objectContaining({ statusCode: 500, error: 'InvalidCredentialsError' }),
    );
  });
});
