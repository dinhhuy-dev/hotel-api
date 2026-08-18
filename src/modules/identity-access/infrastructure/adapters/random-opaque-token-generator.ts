import { Inject, Injectable } from '@nestjs/common';
import {
  GeneratedOpaqueToken,
  OpaqueTokenGeneratorPort,
} from '../../application/ports/outbound/opaque-token-generator.port';
import authConfig from 'src/configs/auth.config';
import type { ConfigType } from '@nestjs/config';
import { CLOCK } from '../../application/ports/outbound/identity-access.token';
import type { ClockPort } from '../../application/ports/outbound/clock.port';
import { randomBytes } from 'node:crypto';

@Injectable()
export class RandomOpaqueTokenGenerator implements OpaqueTokenGeneratorPort {
  constructor(
    @Inject(authConfig.KEY)
    private readonly configuration: ConfigType<typeof authConfig>,

    @Inject(CLOCK)
    private readonly clock: ClockPort,
  ) {}

  generateRefreshToken(): GeneratedOpaqueToken {
    return this.generateToken(this.configuration.refreshToken.ttlHours * 60 * 60);
  }
  generateEmailVerificationToken(): GeneratedOpaqueToken {
    return this.generateToken(this.configuration.emailVerification.ttlMinutes * 60);
  }

  generatePasswordResetToken(): GeneratedOpaqueToken {
    return this.generateToken(this.configuration.passwordReset.ttlMinutes * 60);
  }

  private generateToken(ttlSeconds: number): GeneratedOpaqueToken {
    const now = this.clock.now();

    return {
      token: randomBytes(32).toString('base64url'),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
    };
  }
}
