import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountOrmEntity } from './infrastructure/typeorm/entities/account.orm.entity';
import { AccountTokenOrmEntity } from './infrastructure/typeorm/entities/account-token.orm.entity';
import { JwtModule } from '@nestjs/jwt';
import authConfig from 'src/configs/auth.config';
import { ConfigType } from '@nestjs/config';
import { AuthenticationController } from './presentation/http/authentication.controller';
import { SignUpHandler } from './application/commands/sign-up/sign-up.handler';
import { SignInHandler } from './application/commands/sign-in/sign-in.handler';
import { RefreshTokenHandler } from './application/commands/refresh-token/refresh-token.handler';
import { VerifyEmailHandler } from './application/commands/verify-email/verify-email.handler';
import { TypeOrmTransactionContext } from './infrastructure/adapters/typeorm-transaction-context';
import { TypeOrmTransactionRunner } from './infrastructure/adapters/typeorm-transaction-runner';
import { TypeOrmAccountRepository } from './infrastructure/typeorm/repositories/typeorm-account.repository';
import { TypeOrmAccountTokenRepository } from './infrastructure/typeorm/repositories/typeorm-account-token.repository';
import { SystemClock } from './infrastructure/adapters/system-clock';
import { UuidIdGenerator } from './infrastructure/adapters/uuid-id-generator';
import { Argon2PasswordHasher } from './infrastructure/adapters/argon2-password-hasher';
import { Sha256OpaqueTokenHasher } from './infrastructure/adapters/sha256-opaque-token-hasher';
import { RandomOpaqueTokenGenerator } from './infrastructure/adapters/random-opaque-token-generator';
import { JwtAccessTokenService } from './infrastructure/adapters/jwt-access-token.service';
import { SmtpEmailService } from './infrastructure/adapters/smtp-email.service';
import {
  ACCESS_TOKEN_SERVICE,
  ACCOUNT_REPOSITORY,
  ACCOUNT_TOKEN_REPOSITORY,
  CLOCK,
  EMAIL_SERVICE,
  ID_GENERATOR,
  OPAQUE_TOKEN_GENERATOR,
  OPAQUE_TOKEN_HASHER,
  PASSWORD_HASHER,
  TRANSACTION_RUNNER,
} from './application/ports/outbound/identity-access.token';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountOrmEntity, AccountTokenOrmEntity]),
    JwtModule.registerAsync({
      inject: [authConfig.KEY],
      useFactory: (configuration: ConfigType<typeof authConfig>) => ({
        secret: configuration.accessToken.secret,
        signOptions: {
          algorithm: 'HS256',
          issuer: configuration.issuer,
          audience: configuration.audience,
        },
      }),
    }),
  ],

  controllers: [AuthenticationController],

  providers: [
    SignUpHandler,
    SignInHandler,
    RefreshTokenHandler,
    VerifyEmailHandler,

    TypeOrmTransactionContext,
    TypeOrmTransactionRunner,

    TypeOrmAccountRepository,
    TypeOrmAccountTokenRepository,

    SystemClock,
    UuidIdGenerator,
    Argon2PasswordHasher,
    Sha256OpaqueTokenHasher,
    RandomOpaqueTokenGenerator,
    JwtAccessTokenService,
    SmtpEmailService,

    {
      provide: ACCOUNT_REPOSITORY,
      useExisting: TypeOrmAccountRepository,
    },

    {
      provide: ACCOUNT_TOKEN_REPOSITORY,
      useExisting: TypeOrmAccountTokenRepository,
    },
    {
      provide: CLOCK,
      useExisting: SystemClock,
    },
    {
      provide: ID_GENERATOR,
      useExisting: UuidIdGenerator,
    },
    {
      provide: PASSWORD_HASHER,
      useExisting: Argon2PasswordHasher,
    },
    {
      provide: OPAQUE_TOKEN_HASHER,
      useExisting: Sha256OpaqueTokenHasher,
    },
    {
      provide: OPAQUE_TOKEN_GENERATOR,
      useExisting: RandomOpaqueTokenGenerator,
    },
    {
      provide: ACCESS_TOKEN_SERVICE,
      useExisting: JwtAccessTokenService,
    },
    {
      provide: EMAIL_SERVICE,
      useExisting: SmtpEmailService,
    },
    {
      provide: TRANSACTION_RUNNER,
      useExisting: TypeOrmTransactionRunner,
    },
  ],
})
export class IdentityAccessModule {}
