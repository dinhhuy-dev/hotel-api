import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  ACCOUNT_TOKEN_REPOSITORY,
  CLOCK,
  EMAIL_SERVICE,
  ID_GENERATOR,
  OPAQUE_TOKEN_GENERATOR,
  OPAQUE_TOKEN_HASHER,
  TRANSACTION_RUNNER,
} from '../../ports/outbound/identity-access.token';
import type { AccountRepositoryPort } from '../../ports/outbound/account-repository.port';
import type { AccountTokenRepositoryPort } from '../../ports/outbound/account-token-repository.port';
import type { ClockPort } from '../../ports/outbound/clock.port';
import type { EmailServicePort } from '../../ports/outbound/email-service.port';
import type { IdGeneratorPort } from '../../ports/outbound/id-generator.port';
import type { OpaqueTokenGeneratorPort } from '../../ports/outbound/opaque-token-generator.port';
import type { OpaqueTokenHasherPort } from '../../ports/outbound/opaque-token-hasher.port';
import type { TransactionRunnerPort } from '../../ports/outbound/transaction-runner.port';
import { AccountStatus } from '../../../domain/enums/account-status';
import { AccountToken } from '../../../domain/account-token';
import { AccountTokenType } from '../../../domain/enums/account-token-type';
import { normalizeEmail } from '../../../domain/account';
import { ForgotPasswordCommand } from './forgot-password.command';
import { ForgotPasswordResult } from './forgot-password.result';

@Injectable()
export class ForgotPasswordHandler {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepositoryPort,

    @Inject(ACCOUNT_TOKEN_REPOSITORY)
    private readonly accountTokenRepository: AccountTokenRepositoryPort,

    @Inject(OPAQUE_TOKEN_GENERATOR)
    private readonly opaqueTokenGenerator: OpaqueTokenGeneratorPort,

    @Inject(OPAQUE_TOKEN_HASHER)
    private readonly opaqueTokenHasher: OpaqueTokenHasherPort,

    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailServicePort,

    @Inject(CLOCK)
    private readonly clock: ClockPort,

    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGeneratorPort,

    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: TransactionRunnerPort,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<ForgotPasswordResult> {
    const email = normalizeEmail(command.email);
    const account = await this.accountRepository.findByEmail(email);

    if (
      account === null ||
      account.status !== AccountStatus.ACTIVE ||
      account.emailVerifiedAt === null
    ) {
      return { accepted: true };
    }

    const now = this.clock.now();
    const generatedToken =
      this.opaqueTokenGenerator.generatePasswordResetToken();
    const accountToken = AccountToken.createPasswordResetToken({
      id: this.idGenerator.generate(),
      accountId: account.id,
      tokenHash: this.opaqueTokenHasher.hash(generatedToken.token),
      expiresAt: generatedToken.expiresAt,
      now,
    });

    await this.transactionRunner.run(async () => {
      await this.accountTokenRepository.deleteUnusedByAccountIdAndType(
        account.id,
        AccountTokenType.PASSWORD_RESET,
      );
      await this.accountTokenRepository.save(accountToken);
    });

    await this.emailService.sendPasswordResetEmail({
      email: account.email,
      accountId: account.id,
      token: generatedToken.token,
    });

    return { accepted: true };
  }
}
