import { registerAs } from '@nestjs/config';
import { toNumber } from './config.parsers';

export default registerAs('database', () => ({
  host: process.env.DB_HOST,

  port: toNumber(process.env.DB_PORT) || 5432,

  database: process.env.DB_DATABASE,

  username: process.env.DB_USER,

  password: process.env.DB_PASSWORD,
}));
