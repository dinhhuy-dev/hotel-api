import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_TOKEN_SERVICE,
  ACCOUNT_REPOSITORY,
  ACCOUNT_TOKEN_REPOSITORY,
  CLOCK,
  OPAQUE_TOKEN_GENERATOR,
  OPAQUE_TOKEN_HASHER,
  TRANSACTION_RUNNER,
} from '../../ports/outbound/identity-access.token';
import type { AccountRepositoryPort } from '../../ports/outbound/account-repository.port';
import type { AccountTokenRepositoryPort } from '../../ports/outbound/account-token-repository.port';
import type { ClockPort } from '../../ports/outbound/clock.port';
import type { TransactionRunnerPort } from '../../ports/outbound/transaction-runner.port';
import { VerifyEmailCommand } from './verify-email.command';
import { VerifyEmailResult } from './verify-email.result';
import type { OpaqueTokenGeneratorPort } from '../../ports/outbound/opaque-token-generator.port';
import type { OpaqueTokenHasherPort } from '../../ports/outbound/opaque-token-hasher.port';
import { AccountTokenType } from 'src/modules/identity-access/domain/enums/account-token-type';
import { InvalidAccountTokenError } from 'src/modules/identity-access/domain/errors/invalid-account-token.error';
import type { AccessTokenServicePort } from '../../ports/outbound/access-token-service.port';
import { AccountStatus } from 'src/modules/identity-access/domain/enums/account-status';

@Injectable()
export class VerifyEmailHandler {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepositoryPort,

    @Inject(ACCOUNT_TOKEN_REPOSITORY)
    private readonly accountTokenRepository: AccountTokenRepositoryPort,

    @Inject(OPAQUE_TOKEN_GENERATOR)
    private readonly opaqueTokenGenerator: OpaqueTokenGeneratorPort,

    @Inject(OPAQUE_TOKEN_HASHER)
    private readonly opaqueTokenHasher: OpaqueTokenHasherPort,

    @Inject(ACCESS_TOKEN_SERVICE)
    private readonly accessTokenService: AccessTokenServicePort,

    @Inject(CLOCK)
    private readonly clock: ClockPort,

    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: TransactionRunnerPort,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<VerifyEmailResult> {
    const tokenHash = this.opaqueTokenHasher.hash(command.token);

    const now = this.clock.now();

    const accountToken =
      await this.accountTokenRepository.findByTokenHashAndType(
        tokenHash,
        AccountTokenType.EMAIL_VERIFICATION,
      );

    if (accountToken === null) {
      throw new InvalidAccountTokenError();
    }

    const account = await this.accountRepository.findById(
      accountToken.accountId,
    );
    if (account === null) {
      throw new InvalidAccountTokenError();
    }

    if (account.emailVerifiedAt !== null) {
      return {
        accountId: account.id,
        alreadyVerified: true,
        authentication: null,
      };
    }

    if (account.status !== AccountStatus.PENDING_VERIFICATION) {
      throw new InvalidAccountTokenError();
    }
    accountToken.assertUsable(now);
    account.activateEmail(now);

    const accessToken = await this.accessTokenService.createAccessToken(
      account.id,
      account.role,
    );

    const refreshToken = this.opaqueTokenGenerator.generateRefreshToken();
    const refreshTokenHash = this.opaqueTokenHasher.hash(refreshToken.token);

    account.storeRefreshToken(refreshTokenHash, refreshToken.expiresAt, now);
    accountToken.markAsUsed(now);

    return this.transactionRunner.run(async () => {
      await this.accountRepository.save(account);
      await this.accountTokenRepository.save(accountToken);

      return {
        accountId: account.id,
        alreadyVerified: false,
        authentication: {
          accessToken,
          refreshToken: refreshToken.token,
        },
      };
    });
  }
}
