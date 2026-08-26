import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  CLOCK,
  PASSWORD_HASHER,
} from '../../ports/outbound/identity-access.token';
import type { AccountRepositoryPort } from '../../ports/outbound/account-repository.port';
import type { ClockPort } from '../../ports/outbound/clock.port';
import type { PasswordHasherPort } from '../../ports/outbound/password-hasher.port';
import { InvalidCredentialsError } from '../../errors/identity-application.error';
import { ChangePasswordCommand } from './change-password.command';

@Injectable()
export class ChangePasswordHandler {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepositoryPort,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,

    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const account = await this.accountRepository.findById(command.accountId);

    if (account === null) {
      throw new InvalidCredentialsError();
    }

    account.assertCanSignin();

    const passwordMatches = await this.passwordHasher.compare(
      command.currentPassword,
      account.passwordHash,
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const passwordHash = await this.passwordHasher.hash(command.newPassword);

    account.changePassword(passwordHash, this.clock.now());

    await this.accountRepository.save(account);
  }
}
