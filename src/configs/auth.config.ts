import { registerAs } from '@nestjs/config';
import { toNumber } from './config.parsers';

export default registerAs('auth', () => ({
  issuer: process.env.JWT_ISSUER?.trim() || 'hotel-api',

  audience: process.env.JWT_AUDIENCE?.trim() || 'hotel-client',

  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET,

    ttlMinutes: toNumber(process.env.JWT_ACCESS_TTL_MINUTES) || 15,
  },

  refreshToken: {
    ttlHours: toNumber(process.env.JWT_REFRESH_TTL_HOURS) || 72,
  },

  refreshCookie: {
    name: process.env.REFRESH_COOKIE_NAME ?? 'refresh-token',

    sameSite: process.env.REFRESH_COOKIE_SAME_SITE ?? 'lax',
  },

  emailVerification: {
    ttlMinutes: toNumber(process.env.EMAIL_VERIFICATION_TTL_MINUTES) || 30,
  },
}));
