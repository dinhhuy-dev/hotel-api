import { registerAs } from '@nestjs/config';
import { toNumber } from './config.parsers';

export default registerAs('app', () => ({
  name: process.env.APP_NAME?.trim() || 'hotel-api',

  environment: process.env.NODE_ENV ?? 'development',

  host: process.env.APP_HOST?.trim() || '0.0.0.0',

  port: toNumber(process.env.PORT) || 3000,

  logLevl: process.env.LOG_LEVEL ?? 'info',
}));
