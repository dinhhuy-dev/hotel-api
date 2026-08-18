import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_TOKEN_SERVICE,
  ACCOUNT_REPOSITORY,
  CLOCK,
  OPAQUE_TOKEN_GENERATOR,
  OPAQUE_TOKEN_HASHER,
  PASSWORD_HASHER,
} from '../../ports/outbound/identity-access.token';
import type { AccountRepositoryPort } from '../../ports/outbound/account-repository.port';
import type { PasswordHasherPort } from '../../ports/outbound/password-hasher.port';
import type { AccessTokenServicePort } from '../../ports/outbound/access-token-service.port';
import type { OpaqueTokenGeneratorPort } from '../../ports/outbound/opaque-token-generator.port';
import type { OpaqueTokenHasherPort } from '../../ports/outbound/opaque-token-hasher.port';
import type { ClockPort } from '../../ports/outbound/clock.port';
import { SignInCommand } from './sign-in.command';
import { AuthenticationResult } from '../verify-email/authentication.result';
import { InvalidCredentialsError } from '../../errors/identity-application.error';
import { normalizeEmail } from 'src/modules/identity-access/domain/account';

@Injectable()
export class SignInHandler {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepositoryPort,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,

    @Inject(ACCESS_TOKEN_SERVICE)
    private readonly accessTokenService: AccessTokenServicePort,

    @Inject(OPAQUE_TOKEN_GENERATOR)
    private readonly opaqueTokenGenerator: OpaqueTokenGeneratorPort,

    @Inject(OPAQUE_TOKEN_HASHER)
    private readonly opaqueTokenHasher: OpaqueTokenHasherPort,

    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  async execute(command: SignInCommand): Promise<AuthenticationResult> {
    const email = normalizeEmail(command.email);

    const account = await this.accountRepository.findByEmail(email);
    if (account === null) {
      throw new InvalidCredentialsError();
    }

    account.assertCanSignin();

    const passwordMatches = await this.passwordHasher.compare(
      command.password,
      account.passwordHash,
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const now = this.clock.now();

    const accessToken = await this.accessTokenService.createAccessToken(account.id, account.role);

    const refreshToken = this.opaqueTokenGenerator.generateRefreshToken();

    const refreshTokenHash = this.opaqueTokenHasher.hash(refreshToken.token);

    account.storeRefreshToken(refreshTokenHash, refreshToken.expiresAt, now);

    await this.accountRepository.save(account);
    return {
      accessToken,
      refreshToken: refreshToken.token,
    };
  }
}
