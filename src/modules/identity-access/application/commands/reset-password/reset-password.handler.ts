import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  ACCOUNT_TOKEN_REPOSITORY,
  CLOCK,
  OPAQUE_TOKEN_HASHER,
  PASSWORD_HASHER,
  TRANSACTION_RUNNER,
} from '../../ports/outbound/identity-access.token';
import type { AccountRepositoryPort } from '../../ports/outbound/account-repository.port';
import type { AccountTokenRepositoryPort } from '../../ports/outbound/account-token-repository.port';
import type { ClockPort } from '../../ports/outbound/clock.port';
import type { OpaqueTokenHasherPort } from '../../ports/outbound/opaque-token-hasher.port';
import type { PasswordHasherPort } from '../../ports/outbound/password-hasher.port';
import type { TransactionRunnerPort } from '../../ports/outbound/transaction-runner.port';
import { AccountStatus } from '../../../domain/enums/account-status';
import { AccountTokenType } from '../../../domain/enums/account-token-type';
import { InvalidAccountTokenError } from '../../../domain/errors/invalid-account-token.error';
import { ResetPasswordCommand } from './reset-password.command';

@Injectable()
export class ResetPasswordHandler {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepositoryPort,

    @Inject(ACCOUNT_TOKEN_REPOSITORY)
    private readonly accountTokenRepository: AccountTokenRepositoryPort,

    @Inject(OPAQUE_TOKEN_HASHER)
    private readonly opaqueTokenHasher: OpaqueTokenHasherPort,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,

    @Inject(CLOCK)
    private readonly clock: ClockPort,

    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: TransactionRunnerPort,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    const now = this.clock.now();
    const tokenHash = this.opaqueTokenHasher.hash(command.token);

    const accountToken = await this.accountTokenRepository.findByTokenHashAndType(
      tokenHash,
      AccountTokenType.PASSWORD_RESET,
    );

    if (accountToken === null) {
      throw new InvalidAccountTokenError();
    }

    accountToken.assertUsable(now);

    const account = await this.accountRepository.findById(accountToken.accountId);

    if (
      account === null ||
      account.status !== AccountStatus.ACTIVE ||
      account.emailVerifiedAt === null
    ) {
      throw new InvalidAccountTokenError();
    }

    const passwordHash = await this.passwordHasher.hash(command.newPassword);

    account.changePassword(passwordHash, now);
    accountToken.markAsUsed(now);
    await this.transactionRunner.run(async () => {
      await this.accountRepository.save(account);
      await this.accountTokenRepository.save(accountToken);
    });
  }
}
