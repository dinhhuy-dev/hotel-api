import { Inject, Injectable } from '@nestjs/common';
import { AccessTokenServicePort } from '../../application/ports/outbound/access-token-service.port';
import { AccountRole } from '../../domain/enums/account-role';
import { JwtService } from '@nestjs/jwt';
import authConfig from 'src/configs/auth.config';
import type { ConfigType } from '@nestjs/config';

@Injectable()
export class JwtAccessTokenService implements AccessTokenServicePort {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly configuration: ConfigType<typeof authConfig>,
  ) {}
  createAccessToken(accountId: string, role: AccountRole): Promise<string> {
    return this.jwtService.signAsync(
      { role },
      {
        subject: accountId,
        issuer: this.configuration.issuer,
        audience: this.configuration.audience,
        expiresIn: this.configuration.accessToken.ttlMinutes * 60,
      },
    );
  }
}
