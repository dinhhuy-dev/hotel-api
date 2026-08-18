import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_TOKEN_SERVICE,
  ACCOUNT_REPOSITORY,
  CLOCK,
  OPAQUE_TOKEN_GENERATOR,
  OPAQUE_TOKEN_HASHER,
} from '../../ports/outbound/identity-access.token';
import type { AccountRepositoryPort } from '../../ports/outbound/account-repository.port';
import type { AccessTokenServicePort } from '../../ports/outbound/access-token-service.port';
import type { OpaqueTokenGeneratorPort } from '../../ports/outbound/opaque-token-generator.port';
import type { OpaqueTokenHasherPort } from '../../ports/outbound/opaque-token-hasher.port';
import type { ClockPort } from '../../ports/outbound/clock.port';
import { RefreshTokenCommand } from './refresh-token.command';
import { AuthenticationResult } from '../verify-email/authentication.result';
import { InvalidRefreshTokenError } from '../../errors/identity-application.error';

@Injectable()
export class RefreshTokenHandler {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepositoryPort,

    @Inject(ACCESS_TOKEN_SERVICE)
    private readonly accessTokenService: AccessTokenServicePort,

    @Inject(OPAQUE_TOKEN_GENERATOR)
    private readonly opaqueTokenGenerator: OpaqueTokenGeneratorPort,

    @Inject(OPAQUE_TOKEN_HASHER)
    private readonly opaqueTokenHasher: OpaqueTokenHasherPort,

    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<AuthenticationResult> {
    const refreshTokenHash = this.opaqueTokenHasher.hash(command.token);

    const account = await this.accountRepository.findByRefreshTokenHash(refreshTokenHash);

    if (account === null) {
      throw new InvalidRefreshTokenError();
    }

    account.assertCanSignin();

    const now = this.clock.now();

    const storedExpiration = account.refreshTokenExpiresAt;

    if (storedExpiration === null || storedExpiration.getTime() <= now.getTime()) {
      throw new InvalidRefreshTokenError();
    }

    const accessToken = await this.accessTokenService.createAccessToken(account.id, account.role);

    const newRefreshToken = this.opaqueTokenGenerator.generateRefreshToken();

    const newRefreshTokenHash = this.opaqueTokenHasher.hash(newRefreshToken.token);

    account.storeRefreshToken(newRefreshTokenHash, newRefreshToken.expiresAt, now);

    await this.accountRepository.save(account);

    return {
      accessToken,
      refreshToken: newRefreshToken.token,
    };
  }
}
