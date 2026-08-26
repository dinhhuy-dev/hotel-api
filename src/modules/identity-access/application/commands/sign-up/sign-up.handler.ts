import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  ACCOUNT_TOKEN_REPOSITORY,
  CLOCK,
  EMAIL_SERVICE,
  ID_GENERATOR,
  OPAQUE_TOKEN_GENERATOR,
  OPAQUE_TOKEN_HASHER,
  PASSWORD_HASHER,
  TRANSACTION_RUNNER,
} from '../../ports/outbound/identity-access.token';
import type { AccountRepositoryPort } from '../../ports/outbound/account-repository.port';
import type { AccountTokenRepositoryPort } from '../../ports/outbound/account-token-repository.port';
import type { PasswordHasherPort } from '../../ports/outbound/password-hasher.port';
import type { EmailServicePort } from '../../ports/outbound/email-service.port';
import type { ClockPort } from '../../ports/outbound/clock.port';
import type { IdGeneratorPort } from '../../ports/outbound/id-generator.port';
import type { TransactionRunnerPort } from '../../ports/outbound/transaction-runner.port';
import { SignUpCommand } from './sign-up.command';
import { SignUpResult } from './sign-up.result';
import { Account, normalizeEmail } from 'src/modules/identity-access/domain/account';
import { EmailAlreadyRegisteredError } from '../../errors/identity-application.error';
import { AccountToken } from 'src/modules/identity-access/domain/account-token';
import type { OpaqueTokenGeneratorPort } from '../../ports/outbound/opaque-token-generator.port';
import type { OpaqueTokenHasherPort } from '../../ports/outbound/opaque-token-hasher.port';

@Injectable()
export class SignUpHandler {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepositoryPort,

    @Inject(ACCOUNT_TOKEN_REPOSITORY)
    private readonly accountTokenRepository: AccountTokenRepositoryPort,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,

    @Inject(OPAQUE_TOKEN_HASHER)
    private readonly opaqueTokenHasher: OpaqueTokenHasherPort,

    @Inject(OPAQUE_TOKEN_GENERATOR)
    private readonly opaqueTokenGenerator: OpaqueTokenGeneratorPort,

    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailServicePort,

    @Inject(CLOCK)
    private readonly clock: ClockPort,

    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGeneratorPort,

    @Inject(TRANSACTION_RUNNER)
    private readonly transactionRunner: TransactionRunnerPort,
  ) {}

  async execute(command: SignUpCommand): Promise<SignUpResult> {
    const email = normalizeEmail(command.email);

    const existingAccount = await this.accountRepository.findByEmail(email);

    if (existingAccount !== null) {
      throw new EmailAlreadyRegisteredError();
    }

    const now = this.clock.now();
    const passwordHash = await this.passwordHasher.hash(command.password);

    const account = Account.createPendingVerification({
      id: this.idGenerator.generate(),
      email,
      passwordHash,
      now,
    });

    const verificationToken = this.opaqueTokenGenerator.generateEmailVerificationToken();

    const verificationTokenHash = this.opaqueTokenHasher.hash(verificationToken.token);

    const accountToken = AccountToken.createEmailVerificationToken({
      id: this.idGenerator.generate(),
      accountId: account.id,
      tokenHash: verificationTokenHash,
      expiresAt: verificationToken.expiresAt,
      now,
    });

    await this.transactionRunner.run(async () => {
      await this.accountRepository.save(account);
      await this.accountTokenRepository.save(accountToken);
    });

    const emailResult = await this.emailService.sendVerificationEmail({
      email: account.email,
      accountId: account.id,
      token: verificationToken.token,
    });

    return {
      accountId: account.id,
      verificationEmailSent: emailResult.delivered,
    };
  }
}
