import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import authConfig from 'src/configs/auth.config';
import { AccountRole } from 'src/modules/identity-access/domain/enums/account-role';
import { AuthenticatedUser } from '../security/authenticated-user';

interface JwtAccessPayload {
  sub?: string;
  role?: AccountRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(authConfig.KEY)
    private readonly configuration: ConfigType<typeof authConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configuration.accessToken.secret!,
      issuer: configuration.issuer,
      audience: configuration.audience,
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtAccessPayload): AuthenticatedUser {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      accountId: payload.sub,
      role: payload.role,
    };
  }
}
