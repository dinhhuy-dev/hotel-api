import { Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  CLOCK,
  OPAQUE_TOKEN_HASHER,
} from '../../ports/outbound/identity-access.token';
import type { AccountRepositoryPort } from '../../ports/outbound/account-repository.port';
import type { OpaqueTokenHasherPort } from '../../ports/outbound/opaque-token-hasher.port';
import type { ClockPort } from '../../ports/outbound/clock.port';
import { LogoutCommand } from './logout.command';

@Injectable()
export class LogoutHandler {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepositoryPort,

    @Inject(OPAQUE_TOKEN_HASHER)
    private readonly opaqueTokenHasher: OpaqueTokenHasherPort,

    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const refreshTokenHash = this.opaqueTokenHasher.hash(command.refreshToken);

    const account = await this.accountRepository.findByRefreshTokenHash(refreshTokenHash);

    if (account === null) {
      return;
    }

    account.clearRefreshToken(this.clock.now());

    await this.accountRepository.save(account);
  }
}
